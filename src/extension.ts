import * as vscode from "vscode";
import { loginUser, getFriends, shareCode, db, uploadFile, shareFile } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export function activate(context: vscode.ExtensionContext) {
	console.log("Mint-Share Extension Activated!");

	let disposable = vscode.commands.registerCommand("mint.shareCode", async () => {
		try {
			vscode.window.showInformationMessage("Mint-Share: Preparing to share your code...");

			// Step 1: Get user input (email & password)
			const email = await vscode.window.showInputBox({ prompt: "Enter your email" });
			if (!email) { return vscode.window.showErrorMessage("Login canceled."); }

			const password = await vscode.window.showInputBox({ prompt: "Enter your password", password: true });
			if (!password) { return vscode.window.showErrorMessage("Login canceled."); }

			// Step 2: Authenticate user
			vscode.window.showInformationMessage("🔐 Logging in...");
			const user = await loginUser(email, password);
			if (!user) { return vscode.window.showErrorMessage("Authentication failed."); }

			// Step 3: Get active code selection
			const editor = vscode.window.activeTextEditor;
			if (!editor) { return vscode.window.showErrorMessage("No active editor found."); }

			const selectedText = editor.document.getText(editor.selection);
			if (!selectedText) { return vscode.window.showErrorMessage("No text selected."); }

			// Fetch user details
			vscode.window.showInformationMessage("📡 Fetching user details...");
			if (!user.email) { return vscode.window.showErrorMessage("User email not found."); }

			const usersDetails = await fetchUserDetails(user.email);
			if (!usersDetails || !usersDetails.username) {
				return vscode.window.showErrorMessage("❌ User details not found.");
			}
			console.log(usersDetails.username);

			// Step 4: Fetch Friends List
			vscode.window.showInformationMessage("📡 Fetching friends...");
			const friends = await getFriends(usersDetails.username);
			if (!Array.isArray(friends) || friends.length === 0) {
				return vscode.window.showErrorMessage("No friends found.");
			}


			// Step 5: Show QuickPick to Select a Friend
			const selectedFriend = await vscode.window.showQuickPick(
				friends.map((f) => f.username),
				{ placeHolder: "Select a friend to share your code with" }
			);

			if (!selectedFriend) { return vscode.window.showErrorMessage("Sharing canceled."); }

			// Step 6: Share the Code
			await shareCode(usersDetails.username, selectedFriend, selectedText);
			vscode.window.showInformationMessage(`✅ Code shared successfully with ${selectedFriend}!`);

		} catch (error) {
			console.error("🔥 An error occurred:", (error as Error).message);
			vscode.window.showErrorMessage(`❌ Error: ${(error as Error).message}`);
		}
	});

	let shareFileDisposable = vscode.commands.registerCommand("mint.shareFile", async () => {
		try {
			vscode.window.showInformationMessage("Mint-Share: Preparing to share your file...");
	
			// Step 1: Get user input (email & password)
			const email = await vscode.window.showInputBox({ prompt: "Enter your email" });
			if (!email) {return vscode.window.showErrorMessage("Login canceled.");}
	
			const password = await vscode.window.showInputBox({ prompt: "Enter your password", password: true });
			if (!password) {return vscode.window.showErrorMessage("Login canceled.");}
	
			// Step 2: Authenticate user
			vscode.window.showInformationMessage("🔐 Logging in...");
			const user = await loginUser(email, password);
			if (!user) {return vscode.window.showErrorMessage("Authentication failed.");}
	
			// Fetch user details
			vscode.window.showInformationMessage("📡 Fetching user details...");
			if (!user.email) {return vscode.window.showErrorMessage("User email not found.");}
	
			const usersDetails = await fetchUserDetails(user.email);
			if (!usersDetails || !usersDetails.username) {
				return vscode.window.showErrorMessage("❌ User details not found.");
			}
			console.log(usersDetails.username);
	
			// Step 3: Select a file
			const fileUri = await vscode.window.showOpenDialog({
				canSelectMany: false,
				openLabel: "Select file to share"
			});
	
			if (!fileUri || fileUri.length === 0) {
				return vscode.window.showErrorMessage("No file selected.");
			}
	
			const filePath = fileUri[0].fsPath;
			const fileBuffer = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
	
			// Step 4: Fetch Friends List
			vscode.window.showInformationMessage("📡 Fetching friends...");
			const friends = await getFriends(usersDetails.username);
			if (!Array.isArray(friends) || friends.length === 0) {
				return vscode.window.showErrorMessage("No friends found.");
			}
	
			// Step 5: Show QuickPick to Select a Friend
			const selectedFriend = await vscode.window.showQuickPick(
				friends.map((f) => f.username),
				{ placeHolder: "Select a friend to share your file with" }
			);
	
			if (!selectedFriend) {return vscode.window.showErrorMessage("Sharing canceled.");}
	
			// Step 6: Upload and Share the File
			const success = await shareFile(usersDetails.username, selectedFriend, filePath, Buffer.from(fileBuffer));
			if (success) {
				vscode.window.showInformationMessage(`✅ File shared successfully with ${selectedFriend}!`);
			} else {
				vscode.window.showErrorMessage(`❌ File sharing failed.`);
			}
	
		} catch (error) {
			console.error("🔥 An error occurred:", (error as Error).message);
			vscode.window.showErrorMessage(`❌ Error: ${(error as Error).message}`);
		}
	});
	
	context.subscriptions.push(shareFileDisposable);
	


	context.subscriptions.push(disposable);
}


export async function fetchUserDetails(email: string) {
	try {
		if (!db) { throw new Error("Firestore database is not initialized."); }

		const usersRef = collection(db, "usersList");
		const q = query(usersRef, where("email", "==", email));
		const querySnapshot = await getDocs(q);

		console.log(`🔍 Firestore query found ${querySnapshot.size} results for email: ${email}`);

		if (!querySnapshot.empty) {
			return querySnapshot.docs[0].data();
		} else {
			console.warn(`⚠️ No user found with email: ${email}`);
			return null;
		}
	} catch (error) {
		console.error("🔥 Error fetching user details:", (error as Error).message);
		return null;
	}
}



export function deactivate() {
	console.log("Mint-Share Extension Deactivated.");
}
