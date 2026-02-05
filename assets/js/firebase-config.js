// CONFIGURAÇÃO DO FIREBASE

// Inicializa variáveis globais com valores seguros para evitar falhas no calendar.js
// se este arquivo falhar ou não for carregado corretamente.
window.isFirebaseInitialized = false;
window.db = null;

// Configuração padrão (placeholders)
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "NUMERO",
    appId: "ID_DO_APP"
};

try {
    // Verifica se o objeto global 'firebase' foi carregado pelos scripts no index.html
    if (typeof firebase !== 'undefined') {
        // Verifica se a configuração foi preenchida pelo usuário
        if (firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
            firebase.initializeApp(firebaseConfig);
            window.db = firebase.firestore();
            window.isFirebaseInitialized = true;
            console.log("Firebase conectado com sucesso!");
        } else {
            console.warn("Configuração do Firebase pendente. O aplicativo funcionará em modo offline (LocalStorage).");
        }
    } else {
        console.warn("SDK do Firebase não foi carregado. O aplicativo funcionará em modo offline (LocalStorage).");
    }
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    // Garante que flags estão falsas em caso de erro
    window.isFirebaseInitialized = false;
    window.db = null;
}
