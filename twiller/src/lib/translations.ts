export type LangCode = "en" | "es" | "hi" | "pt" | "zh" | "fr";

export const LANGUAGES: { code: LangCode; label: string; requiresEmailOtp: boolean }[] = [
  { code: "en", label: "English", requiresEmailOtp: false },
  { code: "es", label: "Español", requiresEmailOtp: false },
  { code: "hi", label: "हिन्दी", requiresEmailOtp: false },
  { code: "pt", label: "Português", requiresEmailOtp: false },
  { code: "zh", label: "中文", requiresEmailOtp: false },
  { code: "fr", label: "Français", requiresEmailOtp: true },
];

// Core UI strings translated across all 6 languages. Add more keys here as
// you translate more of the app — every component should read from
// useLanguage().t(key) instead of hardcoding English text.
export const translations: Record<LangCode, Record<string, string>> = {
  en: {
    home: "Home", explore: "Explore", notifications: "Notifications", messages: "Messages",
    bookmarks: "Bookmarks", profile: "Profile", more: "More", post: "Post",
    whats_happening: "What's happening?", logout: "Log out", settings: "Settings",
    premium: "Premium", login: "Log in", signup: "Sign up", forgot_password: "Forgot password?",
    login_history: "Login history", language: "Language", notif_pref: "Notifications",
    upgrade_plan: "Upgrade your plan", tweet: "Post",
  },
  es: {
    home: "Inicio", explore: "Explorar", notifications: "Notificaciones", messages: "Mensajes",
    bookmarks: "Guardados", profile: "Perfil", more: "Más", post: "Postear",
    whats_happening: "¿Qué está pasando?", logout: "Cerrar sesión", settings: "Configuración",
    premium: "Premium", login: "Iniciar sesión", signup: "Registrarse", forgot_password: "¿Olvidaste tu contraseña?",
    login_history: "Historial de inicio de sesión", language: "Idioma", notif_pref: "Notificaciones",
    upgrade_plan: "Mejora tu plan", tweet: "Postear",
  },
  hi: {
    home: "होम", explore: "खोजें", notifications: "सूचनाएं", messages: "संदेश",
    bookmarks: "बुकमार्क", profile: "प्रोफ़ाइल", more: "और", post: "पोस्ट करें",
    whats_happening: "क्या हो रहा है?", logout: "लॉग आउट", settings: "सेटिंग्स",
    premium: "प्रीमियम", login: "लॉग इन करें", signup: "साइन अप करें", forgot_password: "पासवर्ड भूल गए?",
    login_history: "लॉगिन इतिहास", language: "भाषा", notif_pref: "सूचनाएं",
    upgrade_plan: "अपना प्लान अपग्रेड करें", tweet: "पोस्ट करें",
  },
  pt: {
    home: "Início", explore: "Explorar", notifications: "Notificações", messages: "Mensagens",
    bookmarks: "Salvos", profile: "Perfil", more: "Mais", post: "Postar",
    whats_happening: "O que está acontecendo?", logout: "Sair", settings: "Configurações",
    premium: "Premium", login: "Entrar", signup: "Inscrever-se", forgot_password: "Esqueceu a senha?",
    login_history: "Histórico de login", language: "Idioma", notif_pref: "Notificações",
    upgrade_plan: "Atualize seu plano", tweet: "Postar",
  },
  zh: {
    home: "主页", explore: "探索", notifications: "通知", messages: "私信",
    bookmarks: "书签", profile: "个人资料", more: "更多", post: "发布",
    whats_happening: "发生什么事了？", logout: "退出登录", settings: "设置",
    premium: "高级版", login: "登录", signup: "注册", forgot_password: "忘记密码？",
    login_history: "登录历史", language: "语言", notif_pref: "通知",
    upgrade_plan: "升级你的套餐", tweet: "发布",
  },
  fr: {
    home: "Accueil", explore: "Explorer", notifications: "Notifications", messages: "Messages",
    bookmarks: "Signets", profile: "Profil", more: "Plus", post: "Publier",
    whats_happening: "Quoi de neuf ?", logout: "Déconnexion", settings: "Paramètres",
    premium: "Premium", login: "Connexion", signup: "S'inscrire", forgot_password: "Mot de passe oublié ?",
    login_history: "Historique de connexion", language: "Langue", notif_pref: "Notifications",
    upgrade_plan: "Améliorez votre forfait", tweet: "Publier",
  },
};
