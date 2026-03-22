import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAGtUnSG1F8zMyFFW6KBVil-Se_0uS8Yjw",
  authDomain: "dashboard-projets-4cf6d.firebaseapp.com",
  projectId: "dashboard-projets-4cf6d",
  storageBucket: "dashboard-projets-4cf6d.firebasestorage.app",
  messagingSenderId: "360780591967",
  appId: "1:360780591967:web:c429bd0874ffaefee9fcea",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
