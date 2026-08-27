import express from "express";
import mongoose from "mongoose";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import FollowRequest from "../models/followRequest.js";
import { requireAnyAuth } from "../middleware/auth.js";
import { rateLimit } from "../utils/rateLimiter.js";

const router = express.Router();

// Fields returned when listing users so a response never leaks emails,
// passwords, or subscription internals.
const PROFILE_SELECT = "displayName username avatar verified accountType";

// Follow activity shown in the notifications feed.
const FOLLOW_NOTIF_TYPES = ["follow", "follow_request", "request_accepted"];

// Resolves the signed-in user from the session (email) attached by the auth
// middleware. Returns 401 if the account can't be found.
async function resolveCurrentUser(req, res) {
  const user = await User.findOne({ email: req.user?.email || "" });
  if (!user) {
    res.status(404).send({ error: "User not found" });
    return null;
  }
  return user;
}

function validObjectId(id) {
  return mongoose.isValidObjectId(id);
}

/**
 * POST /api/users/follow/:id
 * Makes the signed-in user follow the target user.
 *  - Adds target._id to current.following
 *  - Adds current._id to target.followers
 *  - Creates a "follow" notification for the target
 * Private targets require an approved request first; if none exists yet a
 * request is created here as a safety net and `requiresRequest` is returned
 * so the UI can switch to the "Requested" state.
 */
router.post("/users/follow/:id", requireAnyAuth, async (req, res) => {
  try {
    const limiter = rateLimit({ key: `follow:${req.user?.uid || req.user?.email || req.ip}`, windowMs: 60 * 1000, max: 20 });
    if (!limiter.allowed) return res.status(429).send({ error: "Too many follow requests. Please slow down." });
    const { id } = req.params;
    if (!validObjectId(id)) return res.status(400).send({ error: "Invalid user id" });

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    if (String(current._id) === String(id)) {
      return res.status(400).send({ error: "You cannot follow yourself" });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).send({ error: "User not found" });

    const alreadyFollowing = (target.followers || []).some(
      (f) => String(f) === String(current._id)
    );
    if (alreadyFollowing) {
      return res.status(200).send({
        success: true,
        following: true,
        user: await User.findById(current._id).select(PROFILE_SELECT),
      });
    }

    if (target.accountType === "private") {
      const existing = await FollowRequest.findOne({
        sender: current._id,
        receiver: target._id,
        status: "pending",
      });
      if (!existing) {
        await FollowRequest.create({ sender: current._id, receiver: target._id });
        await Notification.create({
          recipient: target._id,
          actor: current._id,
          type: "follow_request",
        });
      }
      return res.status(200).send({
        success: true,
        requiresRequest: true,
        requested: !!existing,
        user: await User.findById(current._id).select(PROFILE_SELECT),
      });
    }

    await User.updateOne(
      { _id: current._id },
      { $addToSet: { following: target._id } }
    );
    await User.updateOne(
      { _id: target._id },
      { $addToSet: { followers: current._id } }
    );

    await Notification.create({
      recipient: target._id,
      actor: current._id,
      type: "follow",
    });

    const updatedTarget = await User.findById(target._id).select("followers");
    const user = await User.findById(current._id).select(PROFILE_SELECT);
    return res.status(200).send({
      success: true,
      following: true,
      user,
      target: { _id: target._id, followerCount: (updatedTarget?.followers || []).length },
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * POST /api/users/unfollow/:id
 * Removes the follow relationship (idempotent — safe to call repeatedly).
 */
router.post("/users/unfollow/:id", requireAnyAuth, async (req, res) => {
  try {
    const limiter = rateLimit({ key: `follow:${req.user?.uid || req.user?.email || req.ip}`, windowMs: 60 * 1000, max: 20 });
    if (!limiter.allowed) return res.status(429).send({ error: "Too many requests. Please slow down." });
    const { id } = req.params;
    if (!validObjectId(id)) return res.status(400).send({ error: "Invalid user id" });

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    if (String(current._id) === String(id)) {
      return res.status(400).send({ error: "You cannot unfollow yourself" });
    }

    await User.updateOne(
      { _id: current._id },
      { $pull: { following: new mongoose.Types.ObjectId(id) } }
    );
    await User.updateOne(
      { _id: id },
      { $pull: { followers: current._id } }
    );

    const user = await User.findById(current._id).select(PROFILE_SELECT);
    return res.status(200).send({
      success: true,
      following: false,
      user,
      target: { _id: id },
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * GET /api/users/followers/:id
 * Users following the given profile, each with populated profile fields.
 */
router.get("/users/followers/:id", requireAnyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!validObjectId(id)) return res.status(400).send({ error: "Invalid user id" });

    const user = await User.findById(id).select("followers");
    if (!user) return res.status(404).send({ error: "User not found" });

    const followers = await User.find({ _id: { $in: user.followers || [] } })
      .select(PROFILE_SELECT)
      .sort({ joinedDate: -1 })
      .lean();
    return res.status(200).send(followers);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * GET /api/users/following/:id
 * Users the given profile follows, each with populated profile fields.
 */
router.get("/users/following/:id", requireAnyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!validObjectId(id)) return res.status(400).send({ error: "Invalid user id" });

    const user = await User.findById(id).select("following");
    if (!user) return res.status(404).send({ error: "User not found" });

    const following = await User.find({ _id: { $in: user.following || [] } })
      .select(PROFILE_SELECT)
      .sort({ joinedDate: -1 })
      .lean();
    return res.status(200).send(following);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * GET /api/users/suggested
 * Real accounts the signed-in user isn't following yet (excludes self),
 * most-followed first, capped at `limit` (default 5). Drives the
 * "You might like" sidebar.
 */
router.get("/users/suggested", requireAnyAuth, async (req, res) => {
  try {
    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);

    const excluded = new Set([
      String(current._id),
      ...(current.following || []).map((id) => String(id)),
    ]);

    const suggested = await User.find({
      _id: { $nin: Array.from(excluded) },
    })
      .select(PROFILE_SELECT)
      .lean();

    suggested.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0));

    const requested = await pendingRequestedIds(
      current._id,
      suggested.map((u) => u._id)
    );
    const result = suggested
      .slice(0, limit)
      .map((u) => ({ ...u, requested: requested.has(String(u._id)) }));

    return res.status(200).send(result);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * GET /api/users/search?q=
 * People search over displayName / username (case-insensitive substring).
 * Excludes the signed-in user and marks accounts with a pending follow
 * request so buttons render "Requested".
 */
router.get("/users/search", requireAnyAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.status(200).send([]);

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const users = await User.find({
      _id: { $ne: current._id },
      $or: [{ displayName: regex }, { username: regex }],
    })
      .select(PROFILE_SELECT)
      .limit(20)
      .lean();

    const requested = await pendingRequestedIds(
      current._id,
      users.map((u) => u._id)
    );
    const result = users.map((u) => ({ ...u, requested: requested.has(String(u._id)) }));

    return res.status(200).send(result);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * GET /api/users/follow-request/status/:id
 * Relationship state between the signed-in user and the target: whether they
 * already follow and whether a pending request exists.
 */
router.get("/users/follow-request/status/:id", requireAnyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!validObjectId(id)) return res.status(400).send({ error: "Invalid user id" });

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const isFollowing = (current.following || []).some(
      (f) => String(f) === String(id)
    );
    const target = await User.findById(id).select("accountType").lean();
    const pending = await FollowRequest.exists({
      sender: current._id,
      receiver: id,
      status: "pending",
    });

    return res.status(200).send({
      following: isFollowing,
      requested: !!pending,
      accountType: target?.accountType ?? "public",
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * POST /api/users/follow-request/:id
 * Sends a follow request to a private account. Creates the request and a
 * "follow_request" notification for the target. Rejects duplicate requests
 * and requests to accounts already followed.
 */
router.post("/users/follow-request/:id", requireAnyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!validObjectId(id)) return res.status(400).send({ error: "Invalid user id" });

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    if (String(current._id) === String(id)) {
      return res.status(400).send({ error: "You cannot follow yourself" });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).send({ error: "User not found" });

    if (target.accountType !== "private") {
      return res.status(400).send({ error: "This account is public" });
    }

    const alreadyFollowing = (target.followers || []).some(
      (f) => String(f) === String(current._id)
    );
    if (alreadyFollowing) {
      return res.status(400).send({ error: "You already follow this account", following: true });
    }

    const existing = await FollowRequest.findOne({
      sender: current._id,
      receiver: target._id,
      status: "pending",
    });
    if (existing) {
      return res.status(400).send({ error: "Follow request already sent", requested: true });
    }

    await FollowRequest.create({ sender: current._id, receiver: target._id });
    await Notification.create({
      recipient: target._id,
      actor: current._id,
      type: "follow_request",
    });

    return res.status(200).send({
      success: true,
      requested: true,
      target: { _id: target._id },
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * POST /api/users/follow-request/accept/:requestId
 * Lets the receiver of a pending request approve it: establishes the follow
 * in both directions, marks the request accepted, and notifies the sender.
 */
router.post("/users/follow-request/accept/:requestId", requireAnyAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    if (!validObjectId(requestId)) return res.status(400).send({ error: "Invalid request id" });

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const request = await FollowRequest.findOne({ _id: requestId, receiver: current._id });
    if (!request) return res.status(404).send({ error: "Follow request not found" });
    if (request.status !== "pending") {
      return res.status(400).send({ error: "This request is no longer pending" });
    }

    const sender = await User.findById(request.sender);
    if (!sender) return res.status(404).send({ error: "Sender not found" });

    await User.updateOne(
      { _id: sender._id },
      { $addToSet: { following: current._id } }
    );
    await User.updateOne(
      { _id: current._id },
      { $addToSet: { followers: sender._id } }
    );

    request.status = "accepted";
    await request.save();

    await Notification.create({
      recipient: sender._id,
      actor: current._id,
      type: "request_accepted",
    });

    const user = await User.findById(current._id).select(PROFILE_SELECT);
    return res.status(200).send({ success: true, user });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * POST /api/users/follow-request/reject/:requestId
 * Lets the receiver of a pending request decline it. The request is removed.
 */
router.post("/users/follow-request/reject/:requestId", requireAnyAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    if (!validObjectId(requestId)) return res.status(400).send({ error: "Invalid request id" });

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const request = await FollowRequest.findOne({
      _id: requestId,
      receiver: current._id,
      status: "pending",
    });
    if (!request) return res.status(404).send({ error: "Follow request not found" });

    await FollowRequest.deleteOne({ _id: request._id });

    return res.status(200).send({ success: true });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * POST /api/users/follow-request/cancel/:id
 * Lets the sender withdraw a pending request to the given target.
 */
router.post("/users/follow-request/cancel/:id", requireAnyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!validObjectId(id)) return res.status(400).send({ error: "Invalid user id" });

    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    await FollowRequest.deleteOne({
      sender: current._id,
      receiver: id,
      status: "pending",
    });

    return res.status(200).send({ success: true, requested: false });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * GET /api/users/notifications
 * In-app follow activity notifications for the signed-in user, newest first.
 * Covers follows, incoming follow requests, and accepted requests.
 */
router.get("/users/notifications", requireAnyAuth, async (req, res) => {
  try {
    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const notifications = await Notification.find({
      recipient: current._id,
      type: { $in: FOLLOW_NOTIF_TYPES },
    })
      .populate("actor", "displayName username avatar verified")
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    return res.status(200).send(notifications);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * POST /api/users/notifications/read
 * Marks all of the signed-in user's follow notifications as read.
 */
router.post("/users/notifications/read", requireAnyAuth, async (req, res) => {
  try {
    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    await Notification.updateMany(
      { recipient: current._id, read: false },
      { $set: { read: true } }
    );

    return res.status(200).send({ success: true });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * GET /api/users/follow-requests
 * Incoming follow requests for the signed-in user, oldest first, with the
 * sender's profile populated. Drives the Follow Requests page.
 */
router.get("/users/follow-requests", requireAnyAuth, async (req, res) => {
  try {
    const current = await resolveCurrentUser(req, res);
    if (!current) return;

    const requests = await FollowRequest.find({
      receiver: current._id,
      status: "pending",
    })
      .populate("sender", "displayName username avatar verified accountType")
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    return res.status(200).send(requests);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

async function pendingRequestedIds(senderId, receiverIds) {
  if (!receiverIds.length) return new Set();
  const requests = await FollowRequest.find({
    sender: senderId,
    receiver: { $in: receiverIds },
    status: "pending",
  })
    .select("receiver")
    .lean();
  return new Set(requests.map((r) => String(r.receiver)));
}

export default router;
