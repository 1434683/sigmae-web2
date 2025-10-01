import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';  // Para o banco de dados

// Config do seu projeto (cole aqui os valores reais)
const firebaseConfig = {
  apiKey: "AIzaSy... (sua api key)",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicialize o app e exporte o Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Se precisar de Auth, adicione:
// import { getAuth } from 'firebase/auth';
// export const auth = getAuth(app);
