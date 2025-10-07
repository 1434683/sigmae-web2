import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: Substitua este objeto de configuração pelas credenciais do seu projeto Firebase.
// Você pode encontrar essas informações no console do Firebase, nas configurações do seu projeto.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta a instância do Firestore para ser usada em toda a aplicação
export const db = getFirestore(app);
