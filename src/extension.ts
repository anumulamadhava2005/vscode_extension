import * as vscode from "vscode";
import { loginUser, getFriends, shareCode, uploadFile, shareFile, generateQR, postCode, db, logoutUser } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { listenToCodeSnippets, stopListeningToMessages } from "./listenToCodeSnippet";

export async function activate(context: vscode.ExtensionContext) {
	console.log("Mint-Share Extension Activated!");

	let autoUser = await tryAutoLogin(context);
	if (autoUser) {
		vscode.window.showInformationMessage(`👋 Welcome back, ${autoUser.email}`);
	}
	if (autoUser && autoUser.email) {
		const userDetails = await fetchUserDetails(autoUser.email);
		if (userDetails?.username) {
			listenToCodeSnippets(userDetails.username);
		}
	}

	let disposable = vscode.commands.registerCommand("mint.shareCode", async () => {
		try {
			vscode.window.showInformationMessage("Mint-Share: Preparing to share your code...");
			let user = autoUser;
			if (!user) {
				// Step 1: Get user input (email & password)
				const email = await vscode.window.showInputBox({ prompt: "Enter your email" });
				if (!email) { return vscode.window.showErrorMessage("Login canceled."); }

				const password = await vscode.window.showInputBox({ prompt: "Enter your password", password: true });
				if (!password) { return vscode.window.showErrorMessage("Login canceled."); }

				// Step 2: Authenticate user
				vscode.window.showInformationMessage("🔐 Logging in...");
				user = await loginUser(email, password);
				if (!user) { return vscode.window.showErrorMessage("Authentication failed."); }

				// Store credentials locally
				await context.secrets.store("mint_email", email);
				await context.secrets.store("mint_password", password);
				const userDetails = await fetchUserDetails(email);
				if (userDetails?.username) {
					listenToCodeSnippets(userDetails.username);
				}
			}

			// Step 3: Get active code selection
			const editor = vscode.window.activeTextEditor;
			if (!editor) { return vscode.window.showErrorMessage("No active editor found."); }

			const selectedText = editor.document.getText(editor.selection);
			if (!selectedText) { return vscode.window.showErrorMessage("No text selected."); }

			// Fetch user details
			vscode.window.showInformationMessage("📡 Fetching user details...");
			if (!user || !user.email) { return vscode.window.showErrorMessage("User email not found."); }

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

			const selectOption = await vscode.window.showQuickPick(
				["Friends", "Feed"],
				{ placeHolder: "Share to :" }
			);


			// Step 5: Show QuickPick to Select a Friend
			if (selectOption === "Friends") {
				const selectedFriend = await vscode.window.showQuickPick(
					friends.map((f) => f.username),
					{ placeHolder: "Select a friend to share your code with" }
				);
				if (!selectedFriend) { return vscode.window.showErrorMessage("Sharing canceled."); }
				// Step 6: Share the Code
				await shareCode(usersDetails.username, selectedFriend, selectedText);
				vscode.window.showInformationMessage(`✅ Code shared successfully with ${selectedFriend}!`);
			} else if (selectOption === "Feed") {
				const expiration = await vscode.window.showQuickPick(
					["1 hour", "24 hours", "7 days", "Permanent"],
					{ placeHolder: "Set expiration for the snippet" }
				);

				const visibility = await vscode.window.showQuickPick(
					["Public", "Private", "Friends-Only"],
					{ placeHolder: "Set visibility for the snippet" }
				);

				const snippetId = await postCode(usersDetails.username, selectedText);
				const mintLink = `mintv2://snippet?id=${snippetId}`;
				const qrCode = await generateQR(mintLink);
				if (qrCode) {
					const panel = vscode.window.createWebviewPanel(
						"qrCode",
						"Mint-Share QR Code",
						vscode.ViewColumn.One,
						{}
					);
					panel.webview.html = `<img src="${qrCode}" alt="QR Code" />`;
				}
			} else {
				vscode.window.showErrorMessage("Invalid selection");
			}
		} catch (error) {
			console.error("🔥 An error occurred:", (error as Error).message);
			vscode.window.showErrorMessage(`❌ Error: ${(error as Error).message}`);
		}
	});

	let shareFileDisposable = vscode.commands.registerCommand("mint.shareFile", async () => {
		try {
			vscode.window.showInformationMessage("Mint-Share: Preparing to share your file...");
			let user = autoUser;
			if (!user) {
				// Step 1: Get user input (email & password)
				const email = await vscode.window.showInputBox({ prompt: "Enter your email" });
				if (!email) { return vscode.window.showErrorMessage("Login canceled."); }

				const password = await vscode.window.showInputBox({ prompt: "Enter your password", password: true });
				if (!password) { return vscode.window.showErrorMessage("Login canceled."); }

				// Step 2: Authenticate user
				vscode.window.showInformationMessage("🔐 Logging in...");
				user = await loginUser(email, password);
				if (!user) { return vscode.window.showErrorMessage("Authentication failed."); }

				// Store credentials locally
				await context.secrets.store("mint_email", email);
				await context.secrets.store("mint_password", password);
			}

			const usersDetails = await fetchUserDetails(user.email || "");
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

			if (!selectedFriend) { return vscode.window.showErrorMessage("Sharing canceled."); }

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

	let shareDisposable = vscode.commands.registerCommand("mint.share", async (fileUri: vscode.Uri) => {
		try {
			vscode.window.showInformationMessage("Mint-Share: Preparing to share your file...");

			// 🔹 Skip the file picker — fileUri is the clicked file
			if (!fileUri) {
				return vscode.window.showErrorMessage("No file selected.");
			}

			const filePath = fileUri.fsPath;
			const fileBuffer = await vscode.workspace.fs.readFile(fileUri);

			// 🔐 Auto-login or prompt
			let user = autoUser;
			if (!user) {
				// Step 1: Get user input (email & password)
				const email = await vscode.window.showInputBox({ prompt: "Enter your email" });
				if (!email) { return vscode.window.showErrorMessage("Login canceled."); }

				const password = await vscode.window.showInputBox({ prompt: "Enter your password", password: true });
				if (!password) { return vscode.window.showErrorMessage("Login canceled."); }

				// Step 2: Authenticate user
				vscode.window.showInformationMessage("🔐 Logging in...");
				user = await loginUser(email, password);
				if (!user) { return vscode.window.showErrorMessage("Authentication failed."); }

				// Store credentials locally
				await context.secrets.store("mint_email", email);
				await context.secrets.store("mint_password", password);
			}

			const userDetails = await fetchUserDetails(user.email || "");
			if (!userDetails?.username) {
				return vscode.window.showErrorMessage("Could not fetch user details.");
			}

			// 👥 Select a friend
			const friends = await getFriends(userDetails.username);
			if (!friends.length) {
				return vscode.window.showErrorMessage("No friends found.");
			}

			const selectedFriend = await vscode.window.showQuickPick(
				friends.map(f => f.username),
				{ placeHolder: "Select a friend to share your file with" }
			);

			if (!selectedFriend) { return; }

			// 📤 Share file
			const success = await shareFile(userDetails.username, selectedFriend, filePath, Buffer.from(fileBuffer));
			if (success) {
				vscode.window.showInformationMessage(`✅ File shared successfully with ${selectedFriend}!`);
			} else {
				vscode.window.showErrorMessage("❌ File sharing failed.");
			}

		} catch (error: any) {
			console.error("🔥 Error:", error.message);
			vscode.window.showErrorMessage(`❌ Error: ${error.message}`);
		}
	});

	let logoutDisposable = vscode.commands.registerCommand("mint.logout", async () => {
		try {
			await context.secrets.delete("mint_email");
			await context.secrets.delete("mint_password");
			logoutUser();
			autoUser=null;
			stopListeningToMessages?.();
		} catch (error) {

		}
	});


	context.subscriptions.push(shareFileDisposable);

	context.subscriptions.push(shareDisposable);

	context.subscriptions.push(disposable);

	context.subscriptions.push(logoutDisposable);
}

async function tryAutoLogin(context: vscode.ExtensionContext) {
	const email = await context.secrets.get("mint_email");
	const password = await context.secrets.get("mint_password");

	if (!email || !password) {
		console.log("🔐 No saved credentials found.");
		return null;
	}

	console.log("🔐 Attempting auto-login...");

	const user = await loginUser(email, password);
	if (user) {
		console.log("✅ Auto-login successful:", user.email);
	} else {
		console.log("❌ Auto-login failed.");
	}
	return user;
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
	stopListeningToMessages();
}