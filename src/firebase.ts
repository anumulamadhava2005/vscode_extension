import { getAuth, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { getFirestore, collection, doc, getDocs, setDoc, query, where, addDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // 🔹 Added storage imports
import { getApps, initializeApp } from "firebase/app";
import QRCode from 'qrcode';
import * as vscode from 'vscode';

// 🔹 Replace this with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDojFudKt9k-cLmpzFKDZdU7XLkUHgPxx8",
  authDomain: "instagram-clone-ab65f.firebaseapp.com",
  projectId: "instagram-clone-ab65f",
  storageBucket: "instagram-clone-ab65f.appspot.com",
  messagingSenderId: "1070350682511",
  appId: "1:1070350682511:web:8a30213fd482f6af1063fa",
  measurementId: "G-S91WM03QR4"
};

let app: any;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app); // Ensure auth is initialized properly
const storage = getStorage(app); // 🔹 Initialize Firebase Storage

export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch(error) {
    console.log("Error loggin out");
  }
}


export async function generateQR(text: string): Promise<string | null> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text);
    return qrCodeDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return null;
  }
}

export async function getFriends(userId: string) {
  const friendsRef = collection(doc(db, "usersList", userId), "Chats");
  try {
    const snapshot = await getDocs(friendsRef);
    return snapshot.docs.map(doc => ({ username: doc.id }));
  } catch (error) {
    console.error("Error fetching friends list:", error);
    return [];
  }
}

export const db = getFirestore(app);

export async function postCode(senderId: string, content: string) {
  try {
    const recipientQuery = collection(db, "codePosts");
    const docRed1 = await addDoc(recipientQuery, {
      sender: senderId,
      code: content,
      timestamp: serverTimestamp()
    });
    return docRed1.id;
  } catch (error) {
    console.error("Error posting content:", error);
    return;
  }
}

  export async function getUserDetails (uid: any) {
    try {
      const userRef = doc(db, "usersList", uid);
      const doc1 = await getDoc(userRef);
      if (doc1.exists()) {
        const userData = doc1.data();
        return userData;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

export async function shareCode(senderId: string, recipient: string, content: string, type: "code-snippet" | "file" = "code-snippet") {
  try {
    console.log("recipient", recipient, "sender", senderId);
    const recipientQuery = query(collection(db, "usersList"), where("username", "==", recipient));
    const recipientSnapshot = await getDocs(recipientQuery);
    const senderDocRef = doc(db, "usersList", recipient, "Chats", senderId);
    const senderDocSnap = await getDoc(senderDocRef);
    let senderChat:any;
      const userData = await getUserDetails(senderDocSnap.id);

    if (senderDocSnap.exists()) {
      senderChat = { id: senderDocSnap.id, imageUrl: userData?.imageUrl, ...senderDocSnap.data() };
    } else {
      console.log("No such document!");
    }
    if (recipientSnapshot.empty) {
      throw new Error("Recipient not found.");
    }

    const recipientId = recipientSnapshot.docs[0].id;
    let sharedSnippetRef: any;
    let sharedSnippetRef2: any;
    // Reference to messages collection 
    sharedSnippetRef = collection(doc(collection(doc(db, "usersList", senderId), 'Chats'), recipientId), 'messages');
    sharedSnippetRef2 = collection(doc(collection(doc(db, "usersList", recipientId), 'Chats'), senderId), 'messages');

    // Add message
    if (senderId === recipientId) {
      const docRef1 = await addDoc(sharedSnippetRef, {
        sender: senderId,
        recipient: recipientId,
        text: "",
        media: content,
        mediaType: type, // Differentiates between "code-snippet" and "file"
        replyingTo: null,
        timestamp: serverTimestamp(),
        chat: recipientSnapshot.docs[0].data()
      });
      const chatRef2 = doc(collection(doc(db, "usersList", senderId), 'Chats'), recipientId);
      await updateDoc(chatRef2, { timeStamp: serverTimestamp() });
      return docRef1.id;

    } else {

      const docRef1 = await addDoc(sharedSnippetRef, {
        sender: senderId,
        recipient: recipientId,
        text: "",
        media: content,
        mediaType: type, // Differentiates between "code-snippet" and "file"
        replyingTo: null,
        timestamp: serverTimestamp(),
        chat: recipientSnapshot.docs[0].data()
      });

      const docRef2 = await addDoc(sharedSnippetRef2, {
        sender: senderId,
        recipient: recipientId,
        text: "",
        media: content,
        mediaType: type,
        replyingTo: null,
        timestamp: serverTimestamp(),
        chat: recipientSnapshot.docs[0].data()
      });
      const messageData = {
        id: senderId,
        text: "",
        media: content || "",
        mediaType: type || "text",
        timestamp: serverTimestamp(),
        sender: senderId,
        replyingTo: null,
        chat: senderChat,
      };
      // Update chat timestamp
      const chatRef1 = doc(collection(doc(db, "usersList", recipientId), 'Chats'), senderId);
      const chatRef2 = doc(collection(doc(db, "usersList", senderId), 'Chats'), recipientId);
      await updateDoc(chatRef1, { timeStamp: serverTimestamp() });
      await updateDoc(chatRef2, { timeStamp: serverTimestamp() });
      await sendNotfication(recipient, messageData, senderId);
      return docRef1.id;
    }


  } catch (error) {
    console.error("Error sharing content:", error);
    return false;
  }
}

export async function sendNotfication(recipient: string, messageData: any, currentUser: any) {
  try {
    const tokendRef = query(collection(doc(db, "usersList", recipient), 'Tokens'));
    const tokensSnapshot = await getDocs(tokendRef);

    if (tokensSnapshot.empty) {
      console.log("No tokens found for the recipient.");
      return;
    }

    const tokens = tokensSnapshot.docs.map((doc) => doc.data().expoPushToken);
    console.log("Tokens retrieved:", tokens);

    if (tokens.length === 0) {
      console.log("No valid tokens found.");
      return;
    }

    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title: `${currentUser}`,
      body: messageData.text
        ? messageData.text
        : messageData.mediaType === "image"
          ? "📷 Image"
          : messageData.mediaType === "video"
            ? "🎥 Video"
            : messageData.mediaType === "doc"
              ? "📄 Document"
              : messageData.mediaType === "code"
                ? "💻 Code Snippet"
                : "📩 Message",
      data: { messageData, reciever: recipient },
    }));

    // Send notifications concurrently
    await Promise.all(
      messages.map(async (message) => {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });
        const data = await response.json();
        if (data.errors) {
          console.error("Push Notification Error:", data.errors);
        }
      })
    );
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }
}


// 🔹 Function to upload a file and return its download URL
export async function uploadFile(senderId: string, recipient: string, filePath: string, fileBuffer: Buffer) {
  try {
    const fileName = `${Date.now()}_${filePath.split("/").pop()}`;
    const fileRef = ref(storage, `sharedFiles/${senderId}/${fileName}`);

    // Upload file
    await uploadBytes(fileRef, fileBuffer);

    // Generate a download URL
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error("🔥 Error uploading file:", error);
    return null;
  }
}

// 🔹 Function to share a file as a message
export async function shareFile(senderId: string, recipient: string, file: string, fileBuffer: any) {
  try {
    const recipientQuery = query(collection(db, "usersList"), where("username", "==", recipient));
    const recipientSnapshot = await getDocs(recipientQuery);

    if (recipientSnapshot.empty) {
      throw new Error("❌ Recipient not found.");
    }

    const recipientId = recipientSnapshot.docs[0].id;


    // Upload the file
    const fileUrl = await uploadFile(senderId, recipient, file, fileBuffer);
    if (!fileUrl) { throw new Error("❌ File upload failed."); }

    // Prepare message data
    const messageData = {
      sender: senderId,
      recipient: recipientId,
      text: "",
      media: fileUrl,
      mediaType: "file",
      replyingTo: null,
      timestamp: serverTimestamp(),
      chat: recipientSnapshot.docs[0].data(),
    };

    // Save the message in both sender and recipient chat collections
    const senderChatRef = doc(collection(doc(db, "usersList", senderId), "Chats"), recipientId);
    const recipientChatRef = doc(collection(doc(db, "usersList", recipientId), "Chats"), senderId);

    await addDoc(collection(senderChatRef, "messages"), messageData);
    await addDoc(collection(recipientChatRef, "messages"), messageData);

    // Update chat timestamps
    await updateDoc(senderChatRef, { timestamp: serverTimestamp() }).catch(() => { });
    await updateDoc(recipientChatRef, { timestamp: serverTimestamp() }).catch(() => { });

    return true;
  } catch (error) {
    console.error("🔥 Error sharing file:", error);
    return false;
  }
}