import * as vscode from "vscode";
import { db } from "./firebase"; // your Firestore setup
import { collection, doc, onSnapshot, query } from "firebase/firestore";

let unsubscribeFns: (() => void)[] = [];

export function stopListeningToMessages() {
	unsubscribeFns.forEach(unsub => unsub());
	unsubscribeFns = [];
}

export async function listenToCodeSnippets(username: string) {
	try {
		const chatsRef = collection(doc(collection(db, "usersList"), username), "Chats");

		const unsubscribeChats = onSnapshot(chatsRef, (chatSnapshots) => {
			chatSnapshots.forEach((chatDoc) => {
				const chatId = chatDoc.id;

				const messagesRef = collection(chatsRef, chatId, "messages");

				const q = query(messagesRef);

				const unsubscribeMessages = onSnapshot(q, (messageSnapshots) => {
					messageSnapshots.docChanges().forEach(change => {
						if (change.type === "added") {
							const messageData = change.doc.data();

							if (messageData.mediaType === "code-snippet" && messageData.sender !== username) {
								vscode.window.showInformationMessage(`📩 ${messageData.sender} shared a code snippet with you!`);
							}
						}
					});
				});

				unsubscribeFns.push(unsubscribeMessages);
			});
		});

		unsubscribeFns.push(unsubscribeChats);
	} catch (error) {
		console.error("🔥 Error setting up listener:", error);
	}
}
