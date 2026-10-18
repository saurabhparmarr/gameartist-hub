/**
 * Add or refresh GameArtist Hub demo records without deleting other data.
 * Run from the server folder with: node .\seed\seedDatabase.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import ArtistProfile from "../models/ArtistProfile.js";
import Message from "../models/Message.js";
import Portfolio from "../models/Portfolio.js";
import Project from "../models/Project.js";
import SavedArtist from "../models/SavedArtist.js";
import Studio from "../models/Studio.js";
import User from "../models/User.js";

const EXPECTED_DATABASE = "medisync";
const DEMO_EMAIL_DOMAIN = "demo.gameartisthub.local";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD;
const DRY_RUN = process.env.SEED_DRY_RUN === "true";

const artists = [
  {
    name: "Aarav Mehta",
    handle: "aarav",
    bio: "Building atmospheric worlds, modular environments, and cinematic lighting for indie games.",
    skills: ["Environment Art", "Blender", "Unreal Engine 5", "Substance Painter"],
    software: ["Blender", "Unreal Engine 5", "Substance Painter"],
    location: "Mumbai, India",
    experience: 3,
  },
  {
    name: "Ananya Rao",
    handle: "ananya",
    bio: "Turning early game ideas into readable worlds, characters, and visual development boards.",
    skills: ["Concept Art", "Photoshop", "Procreate"],
    software: ["Photoshop", "Procreate"],
    location: "Bengaluru, India",
    experience: 4,
  },
  {
    name: "Kabir Sharma",
    handle: "kabir",
    bio: "Creating stylized characters, expressive silhouettes, and production-ready sculpts.",
    skills: ["Character Art", "ZBrush", "Blender", "Maya"],
    software: ["ZBrush", "Blender", "Maya"],
    location: "Pune, India",
    experience: 2,
  },
  {
    name: "Isha Kapoor",
    handle: "isha",
    bio: "Making colorful 2D worlds, props, and polished game-ready visual assets.",
    skills: ["Concept Art", "Illustration", "Photoshop", "Krita"],
    software: ["Photoshop", "Krita"],
    location: "Delhi, India",
    experience: 3,
  },
  {
    name: "Reyansh Nair",
    handle: "reyansh",
    bio: "Bridging art and engineering with shaders, materials, and optimized real-time scenes.",
    skills: ["3D Environment", "Unity", "Shader Graph", "C#"],
    software: ["Unity", "Shader Graph"],
    location: "Kochi, India",
    experience: 2,
  },
  {
    name: "Meera Joshi",
    handle: "meera",
    bio: "Creating detailed props and believable materials for real-time environments.",
    skills: ["3D Environment", "Blender", "Maya", "Substance 3D Painter"],
    software: ["Blender", "Maya", "Substance 3D Painter"],
    location: "Hyderabad, India",
    experience: 5,
  },
  {
    name: "Arjun Verma",
    handle: "arjun",
    bio: "Creating gameplay animation with strong timing, weight, and readable movement.",
    skills: ["Animation", "Blender", "Maya", "Mixamo"],
    software: ["Blender", "Maya", "Mixamo"],
    location: "Lucknow, India",
    experience: 3,
  },
  {
    name: "Diya Menon",
    handle: "diya",
    bio: "Designing clear game interfaces, HUD systems, and player-friendly interactions.",
    skills: ["Concept Art", "Figma", "Photoshop", "Unity UI"],
    software: ["Figma", "Photoshop", "Unity"],
    location: "Chennai, India",
    experience: 4,
  },
  {
    name: "Vivaan Gupta",
    handle: "vivaan",
    bio: "Exploring mood, scale, and storytelling through real-time environments.",
    skills: ["3D Environment", "Unreal Engine 5", "Blender", "Megascans"],
    software: ["Unreal Engine 5", "Blender", "Megascans"],
    location: "Jaipur, India",
    experience: 3,
  },
  {
    name: "Sara Khan",
    handle: "sara",
    bio: "Creating stylized impacts, magical effects, and readable combat feedback.",
    skills: ["Animation", "Niagara", "After Effects", "Unreal Engine"],
    software: ["Unreal Engine", "Niagara", "After Effects"],
    location: "Mumbai, India",
    experience: 2,
  },
  {
    name: "Aditya Pillai",
    handle: "aditya",
    bio: "Illustrating key art and narrative moments for independent game launches.",
    skills: ["Concept Art", "Illustration", "Photoshop", "Procreate"],
    software: ["Photoshop", "Clip Studio Paint", "Procreate"],
    location: "Kozhikode, India",
    experience: 4,
  },
  {
    name: "Nisha Bansal",
    handle: "nisha",
    bio: "Creating stylized character sculpts, retopology, and polished presentation renders.",
    skills: ["Character Art", "ZBrush", "Blender", "Marmoset Toolbag"],
    software: ["ZBrush", "Blender", "Marmoset Toolbag"],
    location: "Noida, India",
    experience: 3,
  },
];

const artworkImages = [
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=85",
  "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&q=85",
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=85",
  "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=1200&q=85",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=85",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=85",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&q=85",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&q=85",
];

const portfolioCategories = [
  "3D Environment",
  "Concept Art",
  "Character Art",
  "Concept Art",
  "3D Environment",
  "3D Environment",
  "Animation",
  "Concept Art",
  "3D Environment",
  "Animation",
  "Concept Art",
  "Character Art",
];

const studios = [
  {
    name: "Copper Fox Interactive",
    handle: "copper-fox",
    description:
      "An independent studio making story-rich adventure games with distinctive art direction.",
    location: "Mumbai, India",
  },
  {
    name: "Moonlit Pixel Studio",
    handle: "moonlit-pixel",
    description:
      "A small remote-first team creating atmospheric worlds and playful indie experiences.",
    location: "Bengaluru, India",
  },
];

const projectTemplates = [
  {
    title: "Mystic Valley Environment Pack",
    description:
      "Create a stylized fantasy valley with modular cliffs, foliage, ruins, and a cohesive lighting pass.",
    skillsRequired: ["Blender", "Unreal Engine 5", "Substance Painter"],
    budget: 62500,
    status: "open",
  },
  {
    title: "Indie RPG Character Concepts",
    description:
      "Develop three character concepts with silhouettes, color exploration, and final presentation sheets.",
    skillsRequired: ["Concept Art", "Photoshop", "Character Design"],
    budget: 37500,
    status: "open",
  },
  {
    title: "Cozy Town Prop Collection",
    description:
      "Model and texture a set of stylized props for a cozy town game, optimized for real-time use.",
    skillsRequired: ["Blender", "3D Modeling", "PBR Texturing"],
    budget: 45000,
    status: "open",
  },
  {
    title: "Combat Animation Polish",
    description:
      "Polish a small set of locomotion and combat animations with clear anticipation and impact.",
    skillsRequired: ["Blender", "Maya", "Animation"],
    budget: 32500,
    status: "open",
  },
  {
    title: "Sci-Fi Interface Concepts",
    description:
      "Explore visual concepts for a consistent HUD, inventory, and menu flow in a sci-fi action game.",
    skillsRequired: ["Figma", "Concept Art", "Game UI"],
    budget: 26500,
    status: "open",
  },
  {
    title: "Forest Shrine Visual Effects",
    description:
      "Create stylized magical effects for a forest shrine interaction in Unreal Engine.",
    skillsRequired: ["Niagara", "Unreal Engine", "Animation"],
    budget: 32000,
    status: "open",
  },
  {
    title: "Launch Key Art Illustration",
    description:
      "Create a hero illustration and two social crops for an independent game launch.",
    skillsRequired: ["Illustration", "Photoshop", "Concept Art"],
    budget: 22500,
    status: "closed",
  },
  {
    title: "Ancient Temple Environment",
    description:
      "Turn an approved greybox into a polished temple environment with modular assets and set dressing.",
    skillsRequired: ["Blender", "Unreal Engine 5", "Environment Art"],
    budget: 75000,
    status: "closed",
  },
];

const messageTemplates = [
  {
    sender: "copper-fox",
    receiver: "aarav",
    content:
      "Hi Aarav! We liked your environment portfolio and would love to discuss a collaboration.",
  },
  {
    sender: "aarav",
    receiver: "copper-fox",
    content:
      "Thanks for reaching out. I would be happy to hear more about the project.",
  },
  {
    sender: "moonlit-pixel",
    receiver: "ananya",
    content:
      "Hello Ananya! Your concept work caught our eye. Are you available to talk about an upcoming project?",
  },
];

function demoEmail(handle) {
  return `${handle}@${DEMO_EMAIL_DOMAIN}`;
}

function imageFor(index) {
  return artworkImages[index % artworkImages.length];
}

async function getOrCreateDemoUser({ name, handle, role, passwordHash }) {
  const email = demoEmail(handle);
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    if (existingUser.name !== name || existingUser.role !== role) {
      throw new Error(
        `Refusing to modify conflicting account ${email}; expected the demo identity "${name}" with role "${role}".`,
      );
    }
    existingUser.password = passwordHash;
    await existingUser.save();
    return { user: existingUser, created: false };
  }

  const user = await User.create({
    name,
    email,
    password: passwordHash,
    role,
  });
  return { user, created: true };
}

async function validateExistingDemoUsers() {
  const demoUsers = [
    ...artists.map((artist) => ({ ...artist, role: "artist" })),
    ...studios.map((studio) => ({
      name: studio.name,
      handle: studio.handle,
      role: "studio",
    })),
  ];

  for (const demoUser of demoUsers) {
    const existingUser = await User.findOne({ email: demoEmail(demoUser.handle) });
    if (
      existingUser &&
      (existingUser.name !== demoUser.name || existingUser.role !== demoUser.role)
    ) {
      throw new Error(
        `Refusing to modify conflicting account ${demoEmail(demoUser.handle)}; expected the demo identity "${demoUser.name}" with role "${demoUser.role}".`,
      );
    }
  }
}

async function ensureRecord(Model, filter, fields) {
  const result = await Model.updateOne(
    filter,
    { $set: fields },
    { upsert: true, runValidators: true },
  );
  const record = await Model.findOne(filter);

  if (!record) {
    throw new Error(`${Model.modelName} record was not available after upsert.`);
  }

  return { record, created: result.upsertedCount === 1 };
}

function printPlannedCounts() {
  const portfolioCount = artists.length * 2;
  console.log("Dry run enabled; no records were written.");
  console.log(`Users: ${artists.length + studios.length}`);
  console.log(`Artist profiles: ${artists.length}`);
  console.log(`Portfolio items: ${portfolioCount}`);
  console.log(`Studio profiles: ${studios.length}`);
  console.log(`Projects: ${projectTemplates.length}`);
  console.log(`Saved artists: ${studios.length}`);
  console.log(`Messages: ${messageTemplates.length}`);
}

async function seedDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Configure it in server/.env.");
  }

  if (typeof DEMO_PASSWORD !== "string" || DEMO_PASSWORD.length < 8) {
    throw new Error(
      "SEED_DEMO_PASSWORD must be set in the environment and contain at least 8 characters.",
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const databaseName = mongoose.connection.name;
  console.log(`Connected to MongoDB database "${databaseName}" (URI hidden).`);

  if (
    databaseName !== EXPECTED_DATABASE &&
    process.env.SEED_CONFIRM_DATABASE !== databaseName
  ) {
    throw new Error(
      `Refusing to seed "${databaseName}". The expected database is "${EXPECTED_DATABASE}". To explicitly approve another database, set SEED_CONFIRM_DATABASE to its exact name.`,
    );
  }

  console.log(`Database target verified: "${databaseName}".`);

  await validateExistingDemoUsers();

  if (DRY_RUN) {
    printPlannedCounts();
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userByHandle = new Map();
  const counts = {
    usersCreated: 0,
    artistProfilesCreated: 0,
    portfoliosCreated: 0,
    studiosCreated: 0,
    projectsCreated: 0,
    savedArtistsCreated: 0,
    messagesCreated: 0,
  };

  for (const artist of artists) {
    const result = await getOrCreateDemoUser({
      ...artist,
      role: "artist",
      passwordHash,
    });
    userByHandle.set(artist.handle, result.user);
    if (result.created) counts.usersCreated += 1;
  }

  for (const studio of studios) {
    const result = await getOrCreateDemoUser({
      name: studio.name,
      handle: studio.handle,
      role: "studio",
      passwordHash,
    });
    userByHandle.set(studio.handle, result.user);
    if (result.created) counts.usersCreated += 1;
  }

  for (const [index, artist] of artists.entries()) {
    const user = userByHandle.get(artist.handle);
    const result = await ensureRecord(
      ArtistProfile,
      { user: user._id },
      {
        user: user._id,
        bio: artist.bio,
        skills: artist.skills,
        experience: artist.experience,
        location: artist.location,
        profileImage: `https://i.pravatar.cc/400?u=${artist.handle}`,
        software: artist.software,
      },
    );
    if (result.created) counts.artistProfilesCreated += 1;

    for (let itemIndex = 0; itemIndex < 2; itemIndex += 1) {
      const categoryIndex = (index + itemIndex) % portfolioCategories.length;
      const title = `${artist.name} ${portfolioCategories[categoryIndex]} Study ${itemIndex + 1}`;
      const portfolio = await ensureRecord(
        Portfolio,
        { artist: user._id, title },
        {
          artist: user._id,
          title,
          description: `${artist.bio} Portfolio study ${itemIndex + 1}.`,
          category: portfolioCategories[categoryIndex],
          imageUrl: imageFor(index * 2 + itemIndex),
          tools: artist.software,
        },
      );
      if (portfolio.created) counts.portfoliosCreated += 1;
    }
  }

  for (const studio of studios) {
    const user = userByHandle.get(studio.handle);
    const result = await ensureRecord(
      Studio,
      { user: user._id },
      {
        user: user._id,
        studioName: studio.name,
        description: studio.description,
        location: studio.location,
        website: "",
      },
    );
    if (result.created) counts.studiosCreated += 1;
  }

  for (const [index, template] of projectTemplates.entries()) {
    const studio = studios[index % studios.length];
    const user = userByHandle.get(studio.handle);
    const result = await ensureRecord(
      Project,
      { studio: user._id, title: template.title },
      {
        studio: user._id,
        title: template.title,
        description: template.description,
        skillsRequired: template.skillsRequired,
        budget: template.budget,
        status: template.status,
      },
    );
    if (result.created) counts.projectsCreated += 1;
  }

  for (const studio of studios) {
    const studioUser = userByHandle.get(studio.handle);
    const artist = artists[studios.indexOf(studio) % artists.length];
    const artistUser = userByHandle.get(artist.handle);
    const result = await ensureRecord(
      SavedArtist,
      { studio: studioUser._id, artist: artistUser._id },
      { studio: studioUser._id, artist: artistUser._id },
    );
    if (result.created) counts.savedArtistsCreated += 1;
  }

  for (const message of messageTemplates) {
    const sender = userByHandle.get(message.sender);
    const receiver = userByHandle.get(message.receiver);
    const result = await ensureRecord(
      Message,
      {
        sender: sender._id,
        receiver: receiver._id,
        content: message.content,
      },
      {
        sender: sender._id,
        receiver: receiver._id,
        content: message.content,
      },
    );
    if (result.created) counts.messagesCreated += 1;
  }

  const seededUserIds = [...userByHandle.values()].map((user) => user._id);
  const verifiedCounts = await Promise.all([
    User.countDocuments({ _id: { $in: seededUserIds } }),
    ArtistProfile.countDocuments({ user: { $in: seededUserIds } }),
    Portfolio.countDocuments({ artist: { $in: seededUserIds } }),
    Studio.countDocuments({ user: { $in: seededUserIds } }),
    Project.countDocuments({ studio: { $in: studios.map((studio) => userByHandle.get(studio.handle)._id) } }),
    SavedArtist.countDocuments({ studio: { $in: studios.map((studio) => userByHandle.get(studio.handle)._id) } }),
    Message.countDocuments({
      $or: [{ sender: { $in: seededUserIds } }, { receiver: { $in: seededUserIds } }],
    }),
  ]);

  console.log("Seed completed successfully.");
  console.log(
    `Created this run — users: ${counts.usersCreated}, artist profiles: ${counts.artistProfilesCreated}, portfolio items: ${counts.portfoliosCreated}, studio profiles: ${counts.studiosCreated}, projects: ${counts.projectsCreated}, saved artists: ${counts.savedArtistsCreated}, messages: ${counts.messagesCreated}.`,
  );
  console.log(
    `Verified totals for seeded accounts — users: ${verifiedCounts[0]}, artist profiles: ${verifiedCounts[1]}, portfolio items: ${verifiedCounts[2]}, studio profiles: ${verifiedCounts[3]}, projects: ${verifiedCounts[4]}, saved artists: ${verifiedCounts[5]}, messages: ${verifiedCounts[6]}.`,
  );
  console.log(
    `Demo accounts use the configured seed password and email domain "${DEMO_EMAIL_DOMAIN}". Password values are not logged.`,
  );
}

try {
  await seedDatabase();
} catch (error) {
  const safeMessage = String(error?.message || error).replace(
    /mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi,
    "[redacted MongoDB URI]",
  );
  console.error(`Seed failed: ${safeMessage}`);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
