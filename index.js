import fetch from "node-fetch";
import readline from "readline-sync";
import fs from "fs";
import chalk from "chalk";
import cfonts from "cfonts";

cfonts.say("NT Exhaust", {
  font: "block",
  align: "center",
  colors: ["cyan", "magenta"],
  background: "black",
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: "0",
});

console.log(
  chalk.green("=== Telegram Channel : NT Exhaust ( @NTExhaust ) ===")
);

// Read messages from pesan.txt
let messages = [];
try {
  messages = fs
    .readFileSync("pesan.txt", "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (messages.length === 0) {
    throw new Error("pesan.txt is empty!");
  }
} catch (error) {
  console.log(chalk.red(`[❌] Error reading pesan.txt: ${error.message}`));
  process.exit(1);
}

// User input
const channelIds = readline
  .question("Enter channel ID(s) (comma-separated for multiple channels): ")
  .split(",")
  .map((id) => id.trim());
const deleteOption =
  readline
    .question("Do you want to delete the message after sending? (yes/no): ")
    .toLowerCase() === "yes";
const sendDelay =
  parseInt(readline.question("Set send delay (in seconds): ")) * 1000;
let deleteDelay = 0;
let postDeleteDelay = 0;

if (deleteOption) {
  deleteDelay =
    parseInt(readline.question("Set delete delay (in seconds): ")) * 1000;
  postDeleteDelay =
    parseInt(
      readline.question("Set delay after deleting message (in seconds): ")
    ) * 1000;
}

const tokens = fs
  .readFileSync("token.txt", "utf-8")
  .split("\n")
  .map((token) => token.trim());

// Function to pick a random message from pesan.txt
const getRandomMessage = () => {
  return messages[Math.floor(Math.random() * messages.length)];
};

// Send message function
const sendMessage = async (channelId, content, token) => {
  try {
    const response = await fetch(
      `https://discord.com/api/v9/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }
    );

    if (response.ok) {
      const messageData = await response.json();
      console.log(chalk.green(`[✔] Message sent to ${channelId}: ${content}`));
      if (deleteOption) {
        await new Promise((resolve) => setTimeout(resolve, deleteDelay));
        await deleteMessage(channelId, messageData.id, token);
      }
      return messageData.id;
    } else if (response.status === 429) {
      const retryAfter = (await response.json()).retry_after;
      console.log(
        chalk.red(`[⚠] Rate limited! Retrying after ${retryAfter} seconds...`)
      );
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return sendMessage(channelId, content, token);
    }
  } catch (error) {
    console.log(chalk.red(`[❌] Error sending message: ${error.message}`));
  }
  return null;
};

// Delete message function
const deleteMessage = async (channelId, messageId, token) => {
  try {
    const delResponse = await fetch(
      `https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`,
      {
        method: "DELETE",
        headers: { Authorization: token },
      }
    );
    if (delResponse.ok) {
      console.log(
        chalk.blue(`[✔] Deleted message ${messageId} in channel ${channelId}`)
      );
    }
    await new Promise((resolve) => setTimeout(resolve, postDeleteDelay));
  } catch (error) {
    console.log(chalk.red(`[❌] Error deleting message: ${error.message}`));
  }
};

// Main loop to send messages repeatedly
(async () => {
  while (true) {
    for (const token of tokens) {
      for (const channelId of channelIds) {
        const message = getRandomMessage();
        await sendMessage(channelId, message, token);
        await new Promise((resolve) => setTimeout(resolve, sendDelay));
      }
    }
  }
})();
