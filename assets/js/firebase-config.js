// CONFIGURAÇÃO DO FIREBASE
// Para ativar a sincronização:
// 1. Acesse https://console.firebase.google.com/
// 2. Crie um novo projeto
// 3. Vá em "Criação" > "Firestore Database" e crie um banco de dados (modo teste para começar)
// 4. Vá nas configurações do projeto (ícone de engrenagem) > Geral > Seus aplicativos > Adicionar app Web (</>)
// 5. Copie as chaves do `const firebaseConfig` e substitua abaixo.

const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "NUMERO",
    appId: "ID_DO_APP"
};

// Inicializa Firebase apenas se a configuração tiver sido alterada do padrão
let db = null;
let isFirebaseInitialized = false;

try {
    if (firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" && typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        isFirebaseInitialized = true;
        console.log("Firebase conectado!");
    } else {
        console.warn("Firebase não configurado. Usando LocalStorage.");
    }
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
}
