const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { setGlobalOptions } = require("firebase-functions");

admin.initializeApp();
const db = admin.firestore();

// Replace these with your actual Discord app details
const DISCORD_CLIENT_ID = "1388782294478749737";
const DISCORD_CLIENT_SECRET = "T4lNH3OS9ajfIt2wLsEGE_t6dfgq6njE";
const DISCORD_REDIRECT_URI = "https://www.vexorashop.pw/discord-callback.html";

exports.linkDiscord = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be signed in.");
  }

  const code = data.code;
  if (!code) {
    throw new functions.https.HttpsError("invalid-argument", "No code provided.");
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("Discord token error:", tokenData);
      throw new functions.https.HttpsError("unknown", "Failed to get Discord access token");
    }

    // Get Discord user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userResponse.json();

    // Save to Firestore
    await db.collection("users").doc(context.auth.uid).set(
      {
        discordLinked: true,
        discordId: discordUser.id,
        discordUsername: `${discordUser.username}#${discordUser.discriminator}`,
      },
      { merge: true },
    );

    return { success: true, discordUser };
  } catch (error) {
    console.error("Link Discord error:", error);
    throw new functions.https.HttpsError("unknown", "Failed to link Discord");
  }
});

setGlobalOptions({ maxInstances: 10 });
