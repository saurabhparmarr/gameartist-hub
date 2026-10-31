import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import readline from "node:readline";
import User from "../models/User.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const askHidden = (prompt) =>
  new Promise((resolve, reject) => {
    process.stdout.write(prompt);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let value = "";

    const finish = (error) => {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onKeypress = (character, key) => {
      if (key?.ctrl && key.name === "c") {
        finish(new Error("Admin creation cancelled"));
      } else if (key?.name === "return") {
        finish();
      } else if (key?.name === "backspace") {
        value = value.slice(0, -1);
      } else if (character && !key?.ctrl && !key?.meta) {
        value += character;
      }
    };

    process.stdin.on("keypress", onKeypress);
  });

const createAdmin = async () => {
  if (!process.stdin.isTTY) {
    throw new Error("Run this command in an interactive terminal to enter a hidden password");
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from the environment");
  }

  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const name = (await prompt.question("Admin name: ")).trim();
  const email = (await prompt.question("Admin email: ")).trim().toLowerCase();
  prompt.close();

  if (!name || name.length > 120) {
    throw new Error("Name is required and must be 120 characters or fewer");
  }
  if (!emailPattern.test(email)) {
    throw new Error("Enter a valid admin email address");
  }

  const password = await askHidden("Admin password (input hidden): ");
  if (password.length < 12) {
    throw new Error("Admin password must be at least 12 characters long");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const existingUser = await User.findOne({ email }).select("_id");
  if (existingUser) {
    throw new Error("That email already belongs to an account; no account was changed");
  }

  await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: "admin",
  });
  console.log(`Administrator account created for ${email}`);
};

try {
  await createAdmin();
} catch (error) {
  console.error(`Admin account was not created: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
