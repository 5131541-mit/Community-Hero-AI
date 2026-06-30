import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

// Global WebSocket server reference
let wss: WebSocketServer | null = null;

// Resolve paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Increase payload limit for base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Setup local persistence
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "issues.json");

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data for the hackathon
const seedIssues = [
  {
    id: "seed-1",
    title: "Major Pothole on Market St",
    description: "Deep pothole measuring about 2.5 feet across in the middle lane of Market St. It's causing cars to swerve suddenly, which is very dangerous during peak hours.",
    category: "Road",
    specificType: "Pothole",
    severity: "High",
    latitude: 37.7749 + 0.003,
    longitude: -122.4194 - 0.004,
    address: "1150 Market St, San Francisco, CA 94102",
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
    status: "In Progress",
    upvotes: 14,
    upvotedBy: ["civic_fan@gmail.com"],
    reporterEmail: "jane.doe@gmail.com",
    reporterName: "Jane Doe",
    comments: [
      {
        id: "c-1",
        author: "Mark S.",
        text: "Agreed, I almost hit this yesterday. Very dangerous!",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "c-2",
        author: "Road Inspector (System)",
        text: "Assigned to Ward 5 Road Repair Crew. Inspection completed.",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    department: "Road Department",
    priorityScore: 78,
    assignedTo: "Crew Beta"
  },
  {
    id: "seed-2",
    title: "Overflowing Public Garbage Bin",
    description: "The garbage bin at the corner of Powell St and Geary Blvd is completely overflowing. Trash is spilling onto the sidewalk and attracting pigeons and rodents.",
    category: "Waste",
    specificType: "Overflowing Garbage",
    severity: "Medium",
    latitude: 37.7749 + 0.008,
    longitude: -122.4194 + 0.001,
    address: "300 Powell St, San Francisco, CA 94102",
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    status: "Reported",
    upvotes: 9,
    upvotedBy: [],
    reporterEmail: "green_citizen@earth.com",
    reporterName: "Alan Green",
    comments: [],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    department: "Sanitation Department",
    priorityScore: 55
  },
  {
    id: "seed-3",
    title: "Broken Streetlight on 6th St",
    description: "Streetlight completely black for the last 3 nights. Makes the alleyway feel unsafe to walk through at night.",
    category: "Electricity",
    specificType: "Broken Streetlight",
    severity: "Medium",
    latitude: 37.7749 - 0.004,
    longitude: -122.4194 - 0.008,
    address: "150 6th St, San Francisco, CA 94103",
    imageUrl: "https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?auto=format&fit=crop&q=80&w=600",
    status: "Resolved",
    resolvedImageUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=600",
    upvotes: 4,
    upvotedBy: [],
    reporterEmail: "safety_first@yahoo.com",
    reporterName: "Robert Miller",
    comments: [
      {
        id: "c-3",
        author: "Official Team",
        text: "Technician replaced the LED bulb and repaired the fuse box.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    department: "Electricity Board",
    priorityScore: 35,
    assignedTo: "Sparky Crew"
  },
  {
    id: "seed-4",
    title: "Major Water Main Pipe Burst",
    description: "Water is gushing out of the pavement near Mission St and 8th St, creating a massive puddle and flooding the pedestrian crossing.",
    category: "Water",
    specificType: "Water Leak",
    severity: "Critical",
    latitude: 37.7749 - 0.002,
    longitude: -122.4194 - 0.001,
    address: "1180 Mission St, San Francisco, CA 94103",
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600",
    status: "Reported",
    upvotes: 28,
    upvotedBy: ["jane.doe@gmail.com", "civic_fan@gmail.com"],
    reporterEmail: "water_watcher@clean.org",
    reporterName: "Samuel Stone",
    comments: [
      {
        id: "c-4",
        author: "City Utility Bot",
        text: "Critical warning flagged! Automatic dispatch triggered.",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    department: "Water & Sewerage",
    priorityScore: 95
  }
];

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(seedIssues, null, 2));
}

// Read issues helper
const readIssues = (): any[] => {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading issues file:", err);
    return [];
  }
};

// Broadcast issues helper
const broadcastIssuesUpdate = (issues: any[]): void => {
  if (wss) {
    const payload = JSON.stringify({ type: "issues_updated", data: issues });
    let count = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
        count++;
      }
    });
    console.log(`WebSocket Broadcast: Dispatched updated issues list to ${count} clients.`);
  }
};

// Write issues helper
const writeIssues = (issues: any[]): void => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(issues, null, 2));
    broadcastIssuesUpdate(issues);
  } catch (err) {
    console.error("Error writing issues file:", err);
  }
};

// Setup events local persistence
const EVENTS_FILE = path.join(DATA_DIR, "events.json");

const seedEvents = [
  {
    id: "event-1",
    title: "Mission District Trash Cleanup Drive",
    description: "Gather with neighbors to clean litter along Mission St, set up proper public trash bins, and distribute educational flyers on zero-waste living. Equipment like gloves and bags will be provided!",
    category: "Cleanup Drive",
    date: "2026-07-04",
    time: "09:00",
    locationName: "Mission St & 16th St, San Francisco",
    creatorEmail: "green_citizen@earth.com",
    creatorName: "Alan Green",
    attendees: ["sam@stone.com", "jane.doe@gmail.com", "green_citizen@earth.com"],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "event-2",
    title: "Oak Avenue Urban Tree Planting Drive",
    description: "Join the local forestry circle to plant native shade trees along Oak Avenue sidewalks. Helping to construct beautiful green shade corridors that naturally cool our neighborhood streets.",
    category: "Tree Planting",
    date: "2026-07-11",
    time: "10:00",
    locationName: "Oak Avenue Parkside, San Francisco",
    creatorEmail: "jane.doe@gmail.com",
    creatorName: "Jane Doe",
    attendees: ["jane.doe@gmail.com", "water_watcher@clean.org"],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(seedEvents, null, 2));
}

const readEvents = (): any[] => {
  try {
    const data = fs.readFileSync(EVENTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading events file:", err);
    return [];
  }
};

const writeEvents = (events: any[]): void => {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
  } catch (err) {
    console.error("Error writing events file:", err);
  }
};

// Setup assets local persistence
const ASSETS_FILE = path.join(DATA_DIR, "assets.json");

const seedAssets = [
  {
    id: "asset-1",
    name: "Heavy-duty Asphalt Hot-Patcher",
    category: "Roads",
    totalStock: 4,
    availableStock: 4,
    unit: "Units",
    assignedCrews: []
  },
  {
    id: "asset-2",
    name: "Steam Roller Vehicle",
    category: "Roads",
    totalStock: 3,
    availableStock: 3,
    unit: "Units",
    assignedCrews: []
  },
  {
    id: "asset-3",
    name: "Traffic Warning Cones",
    category: "Safety",
    totalStock: 200,
    availableStock: 200,
    unit: "Pcs",
    assignedCrews: []
  },
  {
    id: "asset-4",
    name: "Premium Cold-Mix Polymer Bags",
    category: "Roads",
    totalStock: 120,
    availableStock: 120,
    unit: "Bags",
    assignedCrews: []
  },
  {
    id: "asset-5",
    name: "Bucket Utility Truck",
    category: "Electrical",
    totalStock: 5,
    availableStock: 5,
    unit: "Units",
    assignedCrews: []
  },
  {
    id: "asset-6",
    name: "Thermal Wire Diagnostic Kit",
    category: "Electrical",
    totalStock: 10,
    availableStock: 10,
    unit: "Kits",
    assignedCrews: []
  },
  {
    id: "asset-7",
    name: "Replacement LED Streetlights",
    category: "Electrical",
    totalStock: 80,
    availableStock: 80,
    unit: "Units",
    assignedCrews: []
  },
  {
    id: "asset-8",
    name: "High-Pressure Conduit Pump",
    category: "Water",
    totalStock: 6,
    availableStock: 6,
    unit: "Units",
    assignedCrews: []
  },
  {
    id: "asset-9",
    name: "Acoustic Pipe Leak Locator",
    category: "Water",
    totalStock: 8,
    availableStock: 8,
    unit: "Units",
    assignedCrews: []
  },
  {
    id: "asset-10",
    name: "Industrial Water Pipe Patch Kits",
    category: "Water",
    totalStock: 50,
    availableStock: 50,
    unit: "Kits",
    assignedCrews: []
  },
  {
    id: "asset-11",
    name: "Garbage Compactor Truck",
    category: "Waste",
    totalStock: 6,
    availableStock: 6,
    unit: "Units",
    assignedCrews: []
  }
];

if (!fs.existsSync(ASSETS_FILE)) {
  fs.writeFileSync(ASSETS_FILE, JSON.stringify(seedAssets, null, 2));
}

const readAssets = (): any[] => {
  try {
    const data = fs.readFileSync(ASSETS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading assets file:", err);
    return [];
  }
};

const writeAssets = (assets: any[]): void => {
  try {
    fs.writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2));
  } catch (err) {
    console.error("Error writing assets file:", err);
  }
};

// Initialize Gemini SDK with telemetry header
let isGeminiBlocked = false;

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is not defined!");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

async function checkGeminiStatus() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    isGeminiBlocked = true;
    console.warn("No GEMINI_API_KEY. Defaulting to local/offline smart engine.");
    return;
  }
  try {
    const ai = getGeminiClient();
    // Test with a quick call to check if key is blocked or has quota
    await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "ping",
      config: { maxOutputTokens: 1 }
    });
    isGeminiBlocked = false;
    console.log("Gemini API is active and healthy.");
  } catch (err: any) {
    isGeminiBlocked = true;
    console.warn(`Gemini API is unavailable (${err.message || err}). Enabling local/offline smart engine fallback.`);
  }
}

// --- OFFLINE/LOCAL FALLBACK UTILITIES ---

function fallbackAnalyze(description: string, voiceText: string) {
  const text = ((description || "") + " " + (voiceText || "")).toLowerCase();
  
  let category = "Other";
  let specificType = "Other";
  let department = "Municipal Corporation";
  let severity = "Medium";
  let priorityScore = 50;
  
  // Keyword mapping rules
  if (text.includes("pothole") || text.includes("road") || text.includes("crack") || text.includes("pavement") || text.includes("asphalt")) {
    category = "Road";
    specificType = "Pothole";
    department = "Road Department";
    severity = "High";
    priorityScore = 70;
  } else if (text.includes("trash") || text.includes("garbage") || text.includes("litter") || text.includes("bin") || text.includes("waste") || text.includes("overflow")) {
    category = "Waste";
    specificType = "Overflowing Trash";
    department = "Sanitation Department";
    severity = "Medium";
    priorityScore = 55;
  } else if (text.includes("light") || text.includes("streetlight") || text.includes("dark") || text.includes("bulb") || text.includes("electricity") || text.includes("power")) {
    category = "Electricity";
    specificType = "Broken Streetlight";
    department = "Electricity Board";
    severity = "Medium";
    priorityScore = 45;
  } else if (text.includes("water") || text.includes("leak") || text.includes("pipe") || text.includes("flood") || text.includes("sewer") || text.includes("burst")) {
    category = "Water";
    specificType = "Water Leak";
    department = "Water & Sewerage";
    severity = "High";
    priorityScore = 80;
    if (text.includes("burst") || text.includes("flood") || text.includes("gushing")) {
      severity = "Critical";
      priorityScore = 95;
    }
  } else if (text.includes("safe") || text.includes("danger") || text.includes("hazard") || text.includes("fallen tree") || text.includes("manhole")) {
    category = "Safety";
    specificType = text.includes("tree") ? "Fallen Tree" : text.includes("manhole") ? "Open Manhole" : "Hazard";
    department = "Municipal Corporation";
    severity = "High";
    priorityScore = 75;
  } else if (text.includes("traffic") || text.includes("parking") || text.includes("car") || text.includes("illegal") || text.includes("signal")) {
    category = "Traffic";
    specificType = text.includes("parking") ? "Illegal Parking" : "Traffic Signal Issue";
    department = "Traffic Police";
    severity = "Medium";
    priorityScore = 50;
  }

  // Generate a friendly, action-oriented title from first few words
  let cleanDesc = (description || voiceText || "Civic issue reported by resident").trim();
  let words = cleanDesc.split(/\s+/).slice(0, 5).join(" ");
  let title = words ? `${words.charAt(0).toUpperCase() + words.slice(1)}...` : "New Civic Complaint";
  if (title.length > 35) title = title.substring(0, 32) + "...";

  return {
    title: title,
    description: cleanDesc,
    category: category,
    specificType: specificType,
    severity: severity,
    department: department,
    priorityScore: priorityScore,
    severityAnalysis: `Offline Classified: Matched key patterns related to ${category.toLowerCase()} issues.`,
    damageEstimation: "Localized structural damage to public infrastructure requiring dispatch (Offline Fallback Evaluation)"
  };
}

function fallbackChat(message: string, issues: any[]) {
  const msg = (message || "").toLowerCase();
  
  // 1. Ask about issues near here or critical issues
  if (msg.includes("issue") || msg.includes("problem") || msg.includes("report") || msg.includes("list") || msg.includes("near") || msg.includes("critical") || msg.includes("happen")) {
    const activeIssues = issues.filter(i => i.status !== "Resolved");
    if (activeIssues.length === 0) {
      return "All reported issues in our ward are currently resolved! Thank you for keeping our neighborhood safe. Feel free to report any new issues you spot.";
    }
    
    const critical = activeIssues.filter(i => i.severity === "Critical" || i.severity === "High");
    let response = "I found some active reports in our ward:\n";
    
    if (critical.length > 0) {
      response += `🚨 **Priority Hazards:**\n` + critical.slice(0, 2).map(i => `- ${i.title} (${i.severity} severity) at ${i.address || "Unspecified"} [Status: ${i.status}]`).join("\n") + "\n\n";
    }
    
    const otherIssues = activeIssues.filter(i => i.severity !== "Critical" && i.severity !== "High");
    if (otherIssues.length > 0) {
      response += `⚙️ **Other Active Reports:**\n` + otherIssues.slice(0, 2).map(i => `- ${i.title} at ${i.address || "Unspecified"} [Status: ${i.status}]`).join("\n") + "\n\n";
    }
    
    response += "You can verify and upvote any of these issues on the map to increase their priority score!";
    return response;
  }
  
  // 2. Ask about badge or reward
  if (msg.includes("badge") || msg.includes("point") || msg.includes("xp") || msg.includes("reward") || msg.includes("level") || msg.includes("score")) {
    return "You can level up your profile and earn prestigious citizen badges like: \n- 🛣️ **Road Hero** (Report a road/pothole hazard)\n- 🗑️ **Green Citizen** (Report a waste cleanup incident)\n- 🎖️ **Ward Captain** (Achieve over 400 XP)\n- 💬 **Fixer-Upper** (Leave constructive comments)\n\nEarn XP by submitting new reports (+150 XP), upvoting neighbor issues (+50 XP), and commenting feedback (+30 XP)! Check the **My Rewards** tab to view your active streak and quests!";
  }
  
  // 3. Ask about repairs or fix
  if (msg.includes("repair") || msg.includes("fix") || msg.includes("status") || msg.includes("progress")) {
    const inProgress = issues.filter(i => i.status === "In Progress");
    if (inProgress.length === 0) {
      return "There are no repairs currently flagged as 'In Progress'. Browse active reports on the Map tab to see recent submittals, or report any new infrastructure issue!";
    }
    
    let response = "Here are the repairs currently under active construction:\n";
    response += inProgress.map(i => `- **${i.title}** (Assigned to: ${i.assignedTo || "Official Crew"}) - Status: *${i.status}*`).join("\n");
    response += "\n\nWe appreciate your patience while municipal teams address these issues!";
    return response;
  }
  
  // 4. Ask about water conservation
  if (msg.includes("water") || msg.includes("conserve") || msg.includes("saving") || msg.includes("droplet")) {
    return "Conserving water is vital! Here are 3 top tips for our ward:\n1. Promptly report active main leaks on the map so municipal water crews are dispatched instantly.\n2. Keep public park taps off, and use domestic graywater for gardens.\n3. Verify existing water pipe leak reports in your building or street.";
  }
  
  // 5. Help or Default
  return "I am CivicHero AI, your neighborhood assistant. I can help you find active community complaints, check on ongoing repair crew assignments, list available badges, or guide you on how to earn XP by verifying issues. What can I help you with today?";
}

function fallbackMunicipalQuery(query: string, issues: any[]) {
  const q = (query || "").toLowerCase();
  const total = issues.length;
  const active = issues.filter(i => i.status !== "Resolved");
  const inProgress = issues.filter(i => i.status === "In Progress");
  const resolved = issues.filter(i => i.status === "Resolved");
  const critical = issues.filter(i => i.severity === "Critical" || i.severity === "High");

  let text = `### 📊 Ward 5 Offline Municipal Intelligence Report (Fallback Engine)\n\n`;
  text += `Operational analysis generated on live dataset containing **${total} total tickets** (*${active.length} active backlog*, *${resolved.length} resolved*).\n\n`;

  if (q.includes("crew") || q.includes("dispatch") || q.includes("assign") || q.includes("alpha") || q.includes("beta")) {
    text += `#### 🛠️ Recommended Dispatch Optimization:\n`;
    text += `- **Crew Alpha**: High-priority Road/Pothole tickets (backlog: ${active.filter(i => i.category === "Road").length} tasks).\n`;
    text += `- **Crew Beta**: Urgent Waste & Public Cleanliness (backlog: ${active.filter(i => i.category === "Waste").length} tasks).\n`;
    text += `- **Crew Delta**: High-hazard Water & Electricity repairs (backlog: ${active.filter(i => i.category === "Water" || i.category === "Electricity").length} tasks).\n`;
    text += `- **Crew Sparky**: Streetlight and wire hazards.\n\n`;
    text += `*Recommendation:* Prioritize resolving **${critical.length > 0 ? critical[0].title : "pavement issues"}** first, which currently holds the highest social priority validation.`;
  } else if (q.includes("budget") || q.includes("cost") || q.includes("resource") || q.includes("money")) {
    const estimatedCost = active.length * 1500;
    text += `#### 💰 Estimated Structural Repair Budget Backlog:\n`;
    text += `- **Standard Civil Repair Cost estimate**: $1,500 per incident.\n`;
    text += `- **Total Backlog Valuation**: **$${estimatedCost.toLocaleString()} USD**.\n`;
    text += `- **Primary Allocations Required**:\n`;
    text += `  - Pavement/Road Restoration: $${(active.filter(i => i.category === "Road").length * 1500).toLocaleString()} (approx)\n`;
    text += `  - Electrical Overhauls: $${(active.filter(i => i.category === "Electricity").length * 1500).toLocaleString()} (approx)\n`;
    text += `  - Water Pipe Leak repairs: $${(active.filter(i => i.category === "Water").length * 1500).toLocaleString()} (approx)\n\n`;
    text += `*Tactical Advice:* Allocate 30% contingency buffer for complex sub-base restoration on historical lanes.`;
  } else {
    text += `#### 📈 Executive Dataset Breakdown:\n\n`;
    text += `| Category | Total | Active Backlog | Severity Rank (Avg) |\n`;
    text += `|---|---|---|---|\n`;
    ["Road", "Waste", "Water", "Electricity", "Safety", "Traffic"].forEach(cat => {
      const catIssues = issues.filter(i => i.category === cat);
      const catActive = catIssues.filter(i => i.status !== "Resolved");
      text += `| **${cat}** | ${catIssues.length} | ${catActive.length} | ${catIssues.length > 0 ? "High" : "None"} |\n`;
    });
    text += `\n*Policy Suggestion:* Launch a localized "Green Citizen Maintenance Drive" targeting waste accumulation spots to leverage upvotes and volunteer clearance teams, reducing public expenditure by 12%.`;
  }

  return { text, sources: [{ title: "EPA Municipal Standards Document", uri: "https://www.epa.gov" }] };
}

// --- API ROUTES ---

// 1. Get all issues
app.get("/api/issues", (req, res) => {
  const issues = readIssues();
  res.json(issues);
});

// 2. Submit or save an issue manually
app.post("/api/issues", async (req, res) => {
  try {
    const issues = readIssues();
    const imageUrl = req.body.imageUrl || "";
    let damageEstimation = req.body.damageEstimation || "";

    // Automatically call Gemini Vision if image is present but no damageEstimation was provided
    if (imageUrl && !damageEstimation) {
      if (isGeminiBlocked) {
        // Fallback mapping based on severity
        const sev = (req.body.severity || "Medium").toLowerCase();
        damageEstimation = sev === "critical" ? "critical" : (sev === "high" ? "medium" : "low");
      } else {
        try {
          const ai = getGeminiClient();
          let promptParts: any[] = [
            {
              text: `Analyze this uploaded civic issue image.
We need to populate a 'damageEstimation' field for our database. 
Classify the damage of this issue as exactly one of these lowercase terms: 'critical', 'medium', or 'low'.
Provide your classification strictly in the following JSON format:
{
  "damageEstimation": "one of: critical, medium, low"
}`
            }
          ];

          if (imageUrl.includes(";base64,")) {
            const commaIdx = imageUrl.indexOf(",");
            const mime = imageUrl.substring(imageUrl.indexOf(":") + 1, imageUrl.indexOf(";"));
            const base64Data = imageUrl.substring(commaIdx + 1);

            promptParts.push({
              inlineData: {
                mimeType: mime,
                data: base64Data
              }
            });
          }

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: { parts: promptParts },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  damageEstimation: { type: Type.STRING, enum: ["critical", "medium", "low"] }
                },
                required: ["damageEstimation"]
              }
            }
          });

          const resJson = JSON.parse((response.text || "{}").trim());
          damageEstimation = resJson.damageEstimation || "medium";
        } catch (err: any) {
          console.warn("Gemini Vision damage appraisal on submission failed:", err.message || err);
          // Fallback mapping based on severity
          const sev = (req.body.severity || "Medium").toLowerCase();
          damageEstimation = sev === "critical" ? "critical" : (sev === "high" ? "medium" : "low");
        }
      }
    }

    const newIssue = {
      id: `issue-${Date.now()}`,
      title: req.body.title || "Unnamed Civic Issue",
      description: req.body.description || "No description provided.",
      category: req.body.category || "Other",
      specificType: req.body.specificType || "Unspecified",
      severity: req.body.severity || "Medium",
      latitude: Number(req.body.latitude) || 37.7749,
      longitude: Number(req.body.longitude) || -122.4194,
      address: req.body.address || "Unknown Address",
      imageUrl: imageUrl,
      status: "Reported",
      upvotes: 0,
      upvotedBy: [],
      reporterEmail: req.body.reporterEmail || "anonymous@community.org",
      reporterName: req.body.reporterName || "Anonymous Resident",
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      department: req.body.department || "Municipal Corporation",
      priorityScore: req.body.priorityScore || 50,
      damageEstimation: damageEstimation || undefined
    };

    issues.unshift(newIssue);
    writeIssues(issues);
    res.status(201).json(newIssue);
  } catch (err: any) {
    console.error("Failed to create issue:", err);
    res.status(500).json({ error: "Failed to create issue: " + err.message });
  }
});

// 3. Upvote an issue (Community verification)
app.post("/api/issues/:id/upvote", (req, res) => {
  const issues = readIssues();
  const issueIndex = issues.findIndex((i) => i.id === req.params.id);
  const email = req.body.email || "anonymous@community.org";

  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const issue = issues[issueIndex];
  if (!issue.upvotedBy) {
    issue.upvotedBy = [];
  }

  const alreadyUpvoted = issue.upvotedBy.includes(email);
  if (alreadyUpvoted) {
    // Remove upvote (toggle)
    issue.upvotedBy = issue.upvotedBy.filter((e: string) => e !== email);
    issue.upvotes = Math.max(0, issue.upvotes - 1);
  } else {
    // Add upvote
    issue.upvotedBy.push(email);
    issue.upvotes += 1;
  }

  // Dynamic priority calculation
  const severityWeights: Record<string, number> = { Low: 10, Medium: 25, High: 50, Critical: 80 };
  const baseWeight = severityWeights[issue.severity] || 30;
  issue.priorityScore = Math.min(100, baseWeight + issue.upvotes * 3);
  issue.updatedAt = new Date().toISOString();

  issues[issueIndex] = issue;
  writeIssues(issues);
  res.json(issue);
});

// 4. Add comment to an issue
app.post("/api/issues/:id/comment", (req, res) => {
  const issues = readIssues();
  const issueIndex = issues.findIndex((i) => i.id === req.params.id);

  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const comment = {
    id: `comment-${Date.now()}`,
    author: req.body.author || "Resident",
    text: req.body.text,
    timestamp: new Date().toISOString()
  };

  issues[issueIndex].comments.push(comment);
  issues[issueIndex].updatedAt = new Date().toISOString();
  writeIssues(issues);
  res.status(201).json(issues[issueIndex]);
});

// 4b. Bulk updates for multiple issues (Government Dashboard)
app.post("/api/issues/bulk", (req, res) => {
  const { ids, status, assignedTo } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: "Invalid issue IDs list" });
  }

  const issues = readIssues();
  let updatedCount = 0;

  issues.forEach((issue) => {
    if (ids.includes(issue.id)) {
      if (status) {
        issue.status = status;
      }
      if (assignedTo !== undefined) {
        issue.assignedTo = assignedTo;
      }
      issue.updatedAt = new Date().toISOString();
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    writeIssues(issues);
  }

  res.json({ success: true, updatedCount, issues });
});

// 5. Update issue status (Government Dashboard)
app.post("/api/issues/:id/status", (req, res) => {
  const issues = readIssues();
  const issueIndex = issues.findIndex((i) => i.id === req.params.id);

  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const { status, resolvedImageUrl, assignedTo } = req.body;
  if (status) {
    issues[issueIndex].status = status;
  }
  if (resolvedImageUrl) {
    issues[issueIndex].resolvedImageUrl = resolvedImageUrl;
  }
  if (assignedTo !== undefined) {
    issues[issueIndex].assignedTo = assignedTo;
  }

  // System logging in comments
  const statusLabels: Record<string, string> = {
    "Reported": "Report re-opened or reset to reported.",
    "In Progress": `Work assigned and started${assignedTo ? ` under ${assignedTo}` : ""}.`,
    "Resolved": "Issue successfully fixed! Work proof photo attached and closed by official."
  };

  issues[issueIndex].comments.push({
    id: `sys-${Date.now()}`,
    author: "Official Dashboard (System)",
    text: statusLabels[status] || `Status updated to ${status}.`,
    timestamp: new Date().toISOString()
  });

  issues[issueIndex].updatedAt = new Date().toISOString();
  writeIssues(issues);
  res.json(issues[issueIndex]);
});

// 6. Gemini Vision/Text analyzer endpoint
app.post("/api/gemini/analyze", async (req, res) => {
  const { description, voiceText } = req.body;
  if (isGeminiBlocked) {
    const fallbackResult = fallbackAnalyze(description || "", voiceText || "");
    return res.json(fallbackResult);
  }
  try {
    const { image } = req.body;
    const ai = getGeminiClient();

    let promptParts: any[] = [
      {
        text: `Analyze this hyperlocal civic infrastructure report. You must categorize the issue and extract/generate appropriate details for it.
Inputs:
- Written description: ${description || "None provided"}
- Voice spoken description: ${voiceText || "None provided"}

If there is an image, it is supplied alongside this text prompt.

Provide a highly accurate, professional JSON classification that strictly matches the following schema:
{
  "title": "A short, descriptive, action-oriented title of 4-6 words",
  "description": "An elaborated, professionally phrased summary of the issue based on what you see/read",
  "category": "One of: Road, Waste, Electricity, Water, Safety, Traffic, Other",
  "specificType": "A precise specific label like: Pothole, Broken Streetlight, Overflowing Trash, Water Leak, Fallen Tree, Road Crack, Open Manhole, Illegal Parking, Other",
  "severity": "One of: Low, Medium, High, Critical",
  "department": "One of: Road Department, Sanitation Department, Electricity Board, Water & Sewerage, Traffic Police, Municipal Corporation",
  "priorityScore": "Integer from 10 to 100 based on the danger level (e.g. water gushing on main road is 90+, broken light on narrow street is 30, pothole is 60+)",
  "severityAnalysis": "A 1-sentence helpful reason why this was given this severity/priority score.",
  "damageEstimation": "A 1-sentence professional engineering damage appraisal (e.g., 'high-severity road crack with subsurface decay' or 'shattered fixture housing with electrical hazard'). Describe specifically based on visual image details if available!"
}
`
      }
    ];

    if (image && image.includes(";base64,")) {
      const commaIdx = image.indexOf(",");
      const mime = image.substring(image.indexOf(":") + 1, image.indexOf(";"));
      const base64Data = image.substring(commaIdx + 1);

      promptParts.push({
        inlineData: {
          mimeType: mime,
          data: base64Data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: promptParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING, enum: ["Road", "Waste", "Electricity", "Water", "Safety", "Traffic", "Other"] },
            specificType: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            department: { type: Type.STRING },
            priorityScore: { type: Type.INTEGER },
            severityAnalysis: { type: Type.STRING },
            damageEstimation: { type: Type.STRING }
          },
          required: ["title", "description", "category", "specificType", "severity", "department", "priorityScore", "severityAnalysis", "damageEstimation"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText.trim());
    res.json(resultJson);

  } catch (error: any) {
    isGeminiBlocked = true;
    console.warn(`Gemini API analyze issue call failed (${error.message || error}). Switching to local classifier fallback.`);
    try {
      const fallbackResult = fallbackAnalyze(description || "", voiceText || "");
      res.json(fallbackResult);
    } catch (fallbackError: any) {
      console.warn("Critical: Fallback classification failed:", fallbackError.message || fallbackError);
      res.status(500).json({ error: "Failed to analyze issue: " + (fallbackError.message || "Unknown error") });
    }
  }
});

// 7. Gemini Civic AI Chatbot
app.post("/api/gemini/chat", async (req, res) => {
  const { message } = req.body;
  if (isGeminiBlocked) {
    const issues = readIssues();
    const fallbackResponseText = fallbackChat(message || "", issues);
    return res.json({ text: fallbackResponseText });
  }
  try {
    const { chatHistory } = req.body;
    const issues = readIssues();
    const ai = getGeminiClient();

    const issuesSummary = issues.map((i) => {
      return `- ID: ${i.id}, Title: ${i.title}, Category: ${i.category}, SpecificType: ${i.specificType}, Severity: ${i.severity}, Status: ${i.status}, Upvotes: ${i.upvotes}, Address: ${i.address || "Unspecified"}, Dept: ${i.department}`;
    }).join("\n");

    const systemInstruction = `You are 'CivicHero AI', a world-class urban planning consultant, municipal civil engineer, and empathetic community coordinator.
Your goal is to solve local neighborhood problems with professional, real-world engineering solutions, material specifications, step-by-step resolution pathways, safety protocols, and cost-effective budgeting advice.

When answering, adopt the voice of an elite civic problem solver:
- Structure your response beautifully with concise paragraphs and clear bolding.
- Address the user's specific civic questions with professional, real-world solutions (e.g., explaining how high-durability cold-mix polymer asphalt solves pothole fatigue, how smart municipal grids trace water conduit leaks, or how to implement a localized neighborhood composting program).
- Reference the actual issues from the live ward database when relevant to ground your recommendations in current local data.
- Provide clear, actionable steps for the neighborhood community and municipal crews to collaborate.
- Encourage civic gamification (reminding them how submitting validated reports and upvoting critical issues earns them green XP, citizen levels, and active badges).

Live ward database of reported issues:
${issuesSummary}

Always mention specific real-world engineering standards, environmental regulations, or community coordination methods to make your answer highly practical and educational. Avoid generic, vague, or placeholder answers. Keep the response highly structured, informative, and around 150-200 words.`;

    // Structure history if available
    let contents: any[] = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((h: any) => {
        contents.push({
          role: h.role,
          parts: [{ text: h.text }]
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        tools: [{ googleSearch: {} }]
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks ? groundingChunks.map((chunk: any) => ({
      title: chunk.web?.title || chunk.maps?.title || "Search Source",
      uri: chunk.web?.uri || chunk.maps?.uri || "#"
    })).filter((s: any) => s.uri !== "#") : [];

    res.json({ 
      text: response.text || "I'm sorry, I couldn't process that request.",
      sources: sources
    });

  } catch (error: any) {
    isGeminiBlocked = true;
    console.warn(`Chatbot Gemini API call failed (${error.message || error}). Switching to local chatbot engine fallback.`);
    try {
      const issues = readIssues();
      const fallbackResponseText = fallbackChat(message || "", issues);
      res.json({ text: fallbackResponseText });
    } catch (fallbackError: any) {
      console.warn("Critical: Fallback chat engine failed:", fallbackError.message || fallbackError);
      res.status(500).json({ error: "Failed to respond: " + (fallbackError.message || "Unknown error") });
    }
  }
});

// --- NEW FULL-STACK CIVIC HERO AI ENDPOINTS ---

// 8. Get all community events
app.get("/api/events", (req, res) => {
  try {
    const events = readEvents();
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch events: " + err.message });
  }
});

// 9. Create a new community event
app.post("/api/events/create", (req, res) => {
  try {
    const events = readEvents();
    const { 
      title, 
      description, 
      category, 
      date, 
      time, 
      locationName, 
      creatorEmail, 
      creatorName 
    } = req.body;

    if (!title || !description || !category || !date || !time || !locationName || !creatorEmail || !creatorName) {
      return res.status(400).json({ error: "Missing required fields for event creation" });
    }

    const newEvent = {
      id: `event-${Date.now()}`,
      title,
      description,
      category,
      date,
      time,
      locationName,
      creatorEmail,
      creatorName,
      attendees: [creatorEmail], // creator joins by default
      createdAt: new Date().toISOString()
    };

    events.push(newEvent);
    writeEvents(events);
    res.status(201).json(newEvent);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create event: " + err.message });
  }
});

// 10. Join an existing community event
app.post("/api/events/:id/join", (req, res) => {
  try {
    const events = readEvents();
    const eventIndex = events.findIndex((e) => e.id === req.params.id);
    if (eventIndex === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required to join an event" });
    }

    const event = events[eventIndex];
    if (!event.attendees.includes(email)) {
      event.attendees.push(email);
    }

    events[eventIndex] = event;
    writeEvents(events);
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to join event: " + err.message });
  }
});

// --- ASSET MANAGEMENT ENDPOINTS ---

// Get all assets
app.get("/api/assets", (req, res) => {
  try {
    const assets = readAssets();
    res.json(assets);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch assets: " + err.message });
  }
});

// Create a new asset
app.post("/api/assets/create", (req, res) => {
  try {
    const assets = readAssets();
    const { name, category, totalStock, unit } = req.body;
    if (!name || !category || typeof totalStock !== "number" || !unit) {
      return res.status(400).json({ error: "Missing or invalid fields for asset creation" });
    }
    const newAsset = {
      id: `asset-${Date.now()}`,
      name,
      category,
      totalStock,
      availableStock: totalStock,
      unit,
      assignedCrews: []
    };
    assets.push(newAsset);
    writeAssets(assets);
    res.status(201).json(newAsset);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create asset: " + err.message });
  }
});

// Assign equipment to crew
app.post("/api/assets/:id/assign", (req, res) => {
  try {
    const assets = readAssets();
    const assetIndex = assets.findIndex((a) => a.id === req.params.id);
    if (assetIndex === -1) {
      return res.status(404).json({ error: "Asset not found" });
    }
    const { crewName, allocatedQty } = req.body;
    if (!crewName || typeof allocatedQty !== "number" || allocatedQty <= 0) {
      return res.status(400).json({ error: "Invalid crew name or allocated quantity" });
    }
    const asset = assets[assetIndex];
    if (asset.availableStock < allocatedQty) {
      return res.status(400).json({ error: "Insufficient available stock" });
    }
    
    asset.availableStock -= allocatedQty;
    const existingAssignIdx = asset.assignedCrews.findIndex((c: any) => c.crewName === crewName);
    if (existingAssignIdx > -1) {
      asset.assignedCrews[existingAssignIdx].allocatedQty += allocatedQty;
    } else {
      asset.assignedCrews.push({
        crewName,
        allocatedQty,
        assignedAt: new Date().toISOString()
      });
    }
    assets[assetIndex] = asset;
    writeAssets(assets);
    res.json(asset);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to assign asset: " + err.message });
  }
});

// Return equipment from crew
app.post("/api/assets/:id/return", (req, res) => {
  try {
    const assets = readAssets();
    const assetIndex = assets.findIndex((a) => a.id === req.params.id);
    if (assetIndex === -1) {
      return res.status(404).json({ error: "Asset not found" });
    }
    const { crewName, returnQty } = req.body;
    if (!crewName || typeof returnQty !== "number" || returnQty <= 0) {
      return res.status(400).json({ error: "Invalid crew name or return quantity" });
    }
    const asset = assets[assetIndex];
    const assignIdx = asset.assignedCrews.findIndex((c: any) => c.crewName === crewName);
    if (assignIdx === -1) {
      return res.status(400).json({ error: "No assets assigned to this crew" });
    }
    const allocation = asset.assignedCrews[assignIdx];
    if (allocation.allocatedQty < returnQty) {
      return res.status(400).json({ error: "Return quantity exceeds assigned quantity" });
    }
    
    asset.availableStock += returnQty;
    allocation.allocatedQty -= returnQty;
    if (allocation.allocatedQty === 0) {
      asset.assignedCrews.splice(assignIdx, 1);
    } else {
      asset.assignedCrews[assignIdx] = allocation;
    }
    assets[assetIndex] = asset;
    writeAssets(assets);
    res.json(asset);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to return asset: " + err.message });
  }
});

// Update asset stock level
app.post("/api/assets/:id/update-stock", (req, res) => {
  try {
    const assets = readAssets();
    const assetIndex = assets.findIndex((a) => a.id === req.params.id);
    if (assetIndex === -1) {
      return res.status(404).json({ error: "Asset not found" });
    }
    const { totalStock } = req.body;
    if (typeof totalStock !== "number" || totalStock < 0) {
      return res.status(400).json({ error: "Invalid total stock value" });
    }
    const asset = assets[assetIndex];
    const activeAssignmentsTotal = asset.totalStock - asset.availableStock;
    if (totalStock < activeAssignmentsTotal) {
      return res.status(400).json({ error: "Total stock cannot be less than currently active assignments (" + activeAssignmentsTotal + ")" });
    }
    asset.availableStock = totalStock - activeAssignmentsTotal;
    asset.totalStock = totalStock;
    assets[assetIndex] = asset;
    writeAssets(assets);
    res.json(asset);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update asset stock: " + err.message });
  }
});

// 11. Voice processing helper via Gemini
app.post("/api/gemini/voice-process", async (req, res) => {
  const { voiceText } = req.body;
  if (!voiceText) {
    return res.status(400).json({ error: "Voice transcription is required" });
  }

  if (isGeminiBlocked) {
    const vt = voiceText || "";
    const lowerVt = vt.toLowerCase();
    
    let category = "Other";
    let specificType = "Voice Report";
    let polishedDescription = vt;

    if (lowerVt.includes("pothole") || lowerVt.includes("road") || lowerVt.includes("crack") || lowerVt.includes("pavement")) {
      category = "Road";
      specificType = "Pothole";
      polishedDescription = vt || "Pothole reported on the road surface.";
    } else if (lowerVt.includes("trash") || lowerVt.includes("garbage") || lowerVt.includes("litter") || lowerVt.includes("bin") || lowerVt.includes("overflow")) {
      category = "Waste";
      specificType = "Overflowing Trash";
      polishedDescription = vt || "Overflowing public waste bin or litter accumulation.";
    } else if (lowerVt.includes("light") || lowerVt.includes("streetlight") || lowerVt.includes("dark") || lowerVt.includes("bulb")) {
      category = "Electricity";
      specificType = "Broken Streetlight";
      polishedDescription = vt || "Broken streetlight causing low visibility at night.";
    } else if (lowerVt.includes("water") || lowerVt.includes("leak") || lowerVt.includes("pipe") || lowerVt.includes("burst")) {
      category = "Water";
      specificType = "Water Leak";
      polishedDescription = vt || "Water main leak or pipe bursting reported in public space.";
    } else if (lowerVt.includes("parking") || lowerVt.includes("car") || lowerVt.includes("traffic") || lowerVt.includes("illegal")) {
      category = "Traffic";
      specificType = "Illegal Parking";
      polishedDescription = vt || "Traffic obstruction or illegally parked vehicle reported.";
    }

    return res.json({
      category,
      specificType,
      polishedDescription
    });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `You are an expert helper for a civic issue reporting system. 
Analyze the following spoken voice-to-text transcript from a resident: "${voiceText}".
Determine the most appropriate category, a short specific type, and write a polished, beautifully phrased, and grammatically complete description of the reported problem.

Category must be exactly one of: "Road", "Waste", "Electricity", "Water", "Safety", "Traffic", "Other".

Provide the output strictly in the following JSON format:
{
  "category": "One of the listed categories",
  "specificType": "Short label (e.g., Pothole, Broken Streetlight, Water Leak, Open Manhole)",
  "polishedDescription": "A well-written, professional, and clear version of the spoken report."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            specificType: { type: Type.STRING },
            polishedDescription: { type: Type.STRING }
          },
          required: ["category", "specificType", "polishedDescription"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText.trim()));
  } catch (err: any) {
    isGeminiBlocked = true;
    console.warn(`Gemini voice-process call failed (${err.message || err}). Switching to safe fallback.`);
    // Safe graceful fallback with dynamic keyword analysis
    const vt = req.body.voiceText || "";
    const lowerVt = vt.toLowerCase();
    
    let category = "Other";
    let specificType = "Voice Report";
    let polishedDescription = vt;

    if (lowerVt.includes("pothole") || lowerVt.includes("road") || lowerVt.includes("crack") || lowerVt.includes("pavement")) {
      category = "Road";
      specificType = "Pothole";
      polishedDescription = vt || "Pothole reported on the road surface.";
    } else if (lowerVt.includes("trash") || lowerVt.includes("garbage") || lowerVt.includes("litter") || lowerVt.includes("bin") || lowerVt.includes("overflow")) {
      category = "Waste";
      specificType = "Overflowing Trash";
      polishedDescription = vt || "Overflowing public waste bin or litter accumulation.";
    } else if (lowerVt.includes("light") || lowerVt.includes("streetlight") || lowerVt.includes("dark") || lowerVt.includes("bulb")) {
      category = "Electricity";
      specificType = "Broken Streetlight";
      polishedDescription = vt || "Broken streetlight causing low visibility at night.";
    } else if (lowerVt.includes("water") || lowerVt.includes("leak") || lowerVt.includes("pipe") || lowerVt.includes("burst")) {
      category = "Water";
      specificType = "Water Leak";
      polishedDescription = vt || "Water main leak or pipe bursting reported in public space.";
    } else if (lowerVt.includes("parking") || lowerVt.includes("car") || lowerVt.includes("traffic") || lowerVt.includes("illegal")) {
      category = "Traffic";
      specificType = "Illegal Parking";
      polishedDescription = vt || "Traffic obstruction or illegally parked vehicle reported.";
    }

    res.json({
      category,
      specificType,
      polishedDescription
    });
  }
});

// 12. Recalculate issue priority & risk factor via Gemini
app.post("/api/issues/:id/recalculate-priority", async (req, res) => {
  let issues: any[] = [];
  let issueIndex = -1;
  let issue: any = null;
  try {
    issues = readIssues();
    issueIndex = issues.findIndex((i) => i.id === req.params.id);
    if (issueIndex === -1) {
      return res.status(404).json({ error: "Issue not found" });
    }

    issue = issues[issueIndex];

    if (isGeminiBlocked) {
      const hazardLevel = issue.category === "Road" ? 70 : (issue.category === "Electricity" ? 80 : (issue.category === "Water" ? 85 : 55));
      const propagationRisk = 65;
      const socialDemandScore = Math.min(100, 30 + (issue.upvotes * 5));
      const safetyRecommendation = `Please exercise caution around this ${issue.specificType ? issue.specificType.toLowerCase() : "incident"} reported in the ${issue.category} category.`;
      const priorityScore = Math.round((hazardLevel + propagationRisk + socialDemandScore) / 3);

      issue.priorityScore = priorityScore;
      issue.aiRiskAnalysis = {
        hazardLevel,
        propagationRisk,
        socialDemandScore,
        safetyRecommendation
      };
      issue.updatedAt = new Date().toISOString();

      issues[issueIndex] = issue;
      writeIssues(issues);
      return res.json(issue);
    }

    const ai = getGeminiClient();
    const prompt = `Evaluate the safety risk and priority of this reported civic issue.
Title: ${issue.title}
Category: ${issue.category} (Specific: ${issue.specificType})
Description: ${issue.description}
Damage Appraisal: ${issue.damageEstimation || "None"}
Location Coordinates: ${issue.latitude}, ${issue.longitude} (Landmark: ${issue.address || "Unknown"})
Community Upvotes (Support count): ${issue.upvotes}

Determine:
1. "hazardLevel": an integer from 10 to 100 representing direct danger to human life or vehicles.
2. "propagationRisk": an integer from 10 to 100 representing the risk of this problem expanding or worsening if left untreated.
3. "socialDemandScore": an integer from 10 to 100 calculated using community upvotes as a multiplier.
4. "safetyRecommendation": a 1-sentence expert warning or safety recommendation for residents.
5. "priorityScore": an integer from 10 to 100 which represents a weighted risk factor of the three above dimensions.

Provide the response strictly in the following JSON format:
{
  "hazardLevel": 80,
  "propagationRisk": 75,
  "socialDemandScore": 60,
  "safetyRecommendation": "Residents should avoid driving over this section of the street and park away from the curb.",
  "priorityScore": 76
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hazardLevel: { type: Type.INTEGER },
            propagationRisk: { type: Type.INTEGER },
            socialDemandScore: { type: Type.INTEGER },
            safetyRecommendation: { type: Type.STRING },
            priorityScore: { type: Type.INTEGER }
          },
          required: ["hazardLevel", "propagationRisk", "socialDemandScore", "safetyRecommendation", "priorityScore"]
        }
      }
    });

    const resJson = JSON.parse((response.text || "{}").trim());

    issue.priorityScore = resJson.priorityScore;
    issue.aiRiskAnalysis = {
      hazardLevel: resJson.hazardLevel,
      propagationRisk: resJson.propagationRisk,
      socialDemandScore: resJson.socialDemandScore,
      safetyRecommendation: resJson.safetyRecommendation
    };
    issue.updatedAt = new Date().toISOString();

    issues[issueIndex] = issue;
    writeIssues(issues);
    res.json(issue);
  } catch (err: any) {
    isGeminiBlocked = true;
    console.warn(`Gemini recalculate-priority call failed (${err.message || err}). Switching to programmatic safety score calculation.`);
    try {
      const hazardLevel = issue.category === "Road" ? 70 : (issue.category === "Electricity" ? 80 : (issue.category === "Water" ? 85 : 55));
      const propagationRisk = 65;
      const socialDemandScore = Math.min(100, 30 + (issue.upvotes * 5));
      const safetyRecommendation = `Please exercise caution around this ${issue.specificType ? issue.specificType.toLowerCase() : "incident"} reported in the ${issue.category} category.`;
      const priorityScore = Math.round((hazardLevel + propagationRisk + socialDemandScore) / 3);

      issue.priorityScore = priorityScore;
      issue.aiRiskAnalysis = {
        hazardLevel,
        propagationRisk,
        socialDemandScore,
        safetyRecommendation
      };
      issue.updatedAt = new Date().toISOString();

      issues[issueIndex] = issue;
      writeIssues(issues);
      res.json(issue);
    } catch (fallbackError: any) {
      console.warn("Critical: Programmatic priority recalculation failed:", fallbackError.message || fallbackError);
      res.status(500).json({ error: "Failed to recalculate priority programmatically: " + (fallbackError.message || "Unknown error") });
    }
  }
});

// 13. Summarize community records to create a dynamic AI local news bulletin digest
app.get("/api/gemini/local-news", async (req, res) => {
  if (isGeminiBlocked) {
    try {
      const fallbackIssues = readIssues();
      const fallbackEvents = readEvents();
      
      const active = fallbackIssues.filter(i => i.status !== "Resolved");
      // Find the issue with the highest upvotes or priority
      const topIssue = active.length > 0 
        ? active.reduce((max, cur) => (cur.upvotes || 0) > (max.upvotes || 0) ? cur : max, active[0])
        : null;

      let headlineNews = "All clear in Ward 5! No major infrastructure safety hazards reported by neighbors at this moment. Thank you for keeping our community clean and secure!";
      if (topIssue) {
        headlineNews = `Attention Neighbors: The active report regarding "${topIssue.title}" at ${topIssue.address || "our ward"} is gaining support, with ${topIssue.upvotes || 0} neighbor upvotes. Safety recommends exercising caution near this reported ${topIssue.category.toLowerCase()} area until city crews intervene.`;
      }

      // Next scheduled community event
      const upcomingEvent = fallbackEvents.length > 0 ? fallbackEvents[0] : null;
      let communitySpotlight = "No community events scheduled yet. Check back soon, or be the catalyst by starting your own neighborhood garbage cleanup or street tree planting event!";
      if (upcomingEvent) {
        communitySpotlight = `Civic Power in Action: Get ready for "${upcomingEvent.title}" scheduled for ${upcomingEvent.date} at ${upcomingEvent.locationName || "the community hall"}. This local initiative already has ${upcomingEvent.attendees ? upcomingEvent.attendees.length : 0} neighbors attending. Grab your gear and participate!`;
      }

      // Overall health metric
      const totalActive = active.length;
      const criticalCount = active.filter(i => i.severity === "Critical" || i.severity === "High").length;
      let cityHealthReport = `Ward 5 is currently tracking ${totalActive} active neighborhood reports, including ${criticalCount} priority tasks. Keep submitting upvotes to alert dispatch. Tip of the day: Proper classification gets issues to repair crews 30% faster!`;

      return res.json({
        headlineNews,
        communitySpotlight,
        cityHealthReport
      });
    } catch (fallbackError: any) {
      return res.json({
        headlineNews: "Active Water Main repair on Mission Street is proceeding steadily. Officials are managing lane closures during peak off-hours to prevent delay.",
        communitySpotlight: "The Ward 5 Park Cleanup is scheduled for this coming Saturday morning! Grab your gloves and join the neighborhood community.",
        cityHealthReport: "A healthy week for municipal cooperation! Over 90% of potholes reported have been classified, and local crews are actively resolving backlogs."
      });
    }
  }

  try {
    const issues = readIssues();
    const events = readEvents();
    const ai = getGeminiClient();

    const activeIssuesText = issues
      .filter((i) => i.status !== "Resolved")
      .map((i) => `- [${i.category}] ${i.title} at ${i.address || "unknown location"} (${i.upvotes} upvotes)`)
      .join("\n");

    const currentEventsText = events
      .map((e) => `- [${e.category}] ${e.title} on ${e.date} at ${e.locationName} (${e.attendees.length} attending)`)
      .join("\n");

    const prompt = `You are the local Ward 5 Daily Civic Journalist.
Create an engaging, positive, highly professional and visually structured "Daily Civic Intelligence Bulletin" for local residents.
Base your digest strictly on the active neighborhood issues and upcoming community events in our database:

Active issues list:
${activeIssuesText || "No active issues to report at this time. All clear!"}

Upcoming events:
${currentEventsText || "No events scheduled yet. Encourage people to start one!"}

Your bulletin MUST have 3 concise, exciting sections:
1. "headlineNews": A major story summary based on the most critical or highly upvoted issues. (Keep it exciting, reassuring, and under 80 words)
2. "communitySpotlight": A brief summary inviting residents to upcoming events like Cleanup Drives or Tree Plantings, highlighting the power of civic participation. (Under 60 words)
3. "cityHealthReport": An AI summary appraisal of current neighborhood safety, repair progress, and a tip of the day for zero waste or green living. (Under 60 words)

Provide the output strictly in the following JSON format:
{
  "headlineNews": "Headline content here",
  "communitySpotlight": "Spotlight content here",
  "cityHealthReport": "Health report content here"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headlineNews: { type: Type.STRING },
            communitySpotlight: { type: Type.STRING },
            cityHealthReport: { type: Type.STRING }
          },
          required: ["headlineNews", "communitySpotlight", "cityHealthReport"]
        }
      }
    });

    res.json(JSON.parse((response.text || "{}").trim()));
  } catch (err: any) {
    isGeminiBlocked = true;
    console.warn(`Gemini local-news call failed (${err.message || err}). Switching to dynamic offline news bulletin fallback.`);
    try {
      const fallbackIssues = readIssues();
      const fallbackEvents = readEvents();
      
      const active = fallbackIssues.filter(i => i.status !== "Resolved");
      // Find the issue with the highest upvotes or priority
      const topIssue = active.length > 0 
        ? active.reduce((max, cur) => (cur.upvotes || 0) > (max.upvotes || 0) ? cur : max, active[0])
        : null;

      let headlineNews = "All clear in Ward 5! No major infrastructure safety hazards reported by neighbors at this moment. Thank you for keeping our community clean and secure!";
      if (topIssue) {
        headlineNews = `Attention Neighbors: The active report regarding "${topIssue.title}" at ${topIssue.address || "our ward"} is gaining support, with ${topIssue.upvotes || 0} neighbor upvotes. Safety recommends exercising caution near this reported ${topIssue.category.toLowerCase()} area until city crews intervene.`;
      }

      // Next scheduled community event
      const upcomingEvent = fallbackEvents.length > 0 ? fallbackEvents[0] : null;
      let communitySpotlight = "No community events scheduled yet. Check back soon, or be the catalyst by starting your own neighborhood garbage cleanup or street tree planting event!";
      if (upcomingEvent) {
        communitySpotlight = `Civic Power in Action: Get ready for "${upcomingEvent.title}" scheduled for ${upcomingEvent.date} at ${upcomingEvent.locationName || "the community hall"}. This local initiative already has ${upcomingEvent.attendees ? upcomingEvent.attendees.length : 0} neighbors attending. Grab your gear and participate!`;
      }

      // Overall health metric
      const totalActive = active.length;
      const criticalCount = active.filter(i => i.severity === "Critical" || i.severity === "High").length;
      let cityHealthReport = `Ward 5 is currently tracking ${totalActive} active neighborhood reports, including ${criticalCount} priority tasks. Keep submitting upvotes to alert dispatch. Tip of the day: Proper classification gets issues to repair crews 30% faster!`;

      res.json({
        headlineNews,
        communitySpotlight,
        cityHealthReport
      });
    } catch (fallbackError: any) {
      res.json({
        headlineNews: "Active Water Main repair on Mission Street is proceeding steadily. Officials are managing lane closures during peak off-hours to prevent delay.",
        communitySpotlight: "The Ward 5 Park Cleanup is scheduled for this coming Saturday morning! Grab your gloves and join the neighborhood community.",
        cityHealthReport: "A healthy week for municipal cooperation! Over 90% of potholes reported have been classified, and local crews are actively resolving backlogs."
      });
    }
  }
});

// 14. Natural language AI analytics assistant for Ward 5 Command
app.post("/api/gemini/municipal-query", async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query is required." });
  }

  const issues = readIssues();

  if (isGeminiBlocked) {
    const fallbackResult = fallbackMunicipalQuery(query, issues);
    return res.json(fallbackResult);
  }

  try {
    const ai = getGeminiClient();

    const issuesSummary = issues.map((i) => {
      return `- ID: ${i.id}, Title: ${i.title}, Category: ${i.category}, SpecificType: ${i.specificType}, Severity: ${i.severity}, Status: ${i.status}, Upvotes: ${i.upvotes}, Address: ${i.address || "Unspecified"}, Dept: ${i.department}, PriorityScore: ${i.priorityScore}`;
    }).join("\n");

    const systemInstruction = `You are the Lead Municipal Analytics Engine & Urban Development Planner for Ward 5.
You analyze ward data (complaints, backlogs, severity, upvotes) to help city managers, field operators, and dispatch teams optimize municipal operations.
Provide highly rigorous, data-driven, strategic responses.
When asked a query, look at the live issues data below, perform appropriate classification or quantitative grouping, and return a beautiful structured report including:
1. Executive Data Analysis (break down numbers, percentage backlog, categories, or specific concerns mentioned).
2. Recommended Dispatch Priority (suggest which specific crew - Alpha, Beta, Delta, Sparky - should address which issues first based on urgency and priority).
3. Estimated Budgets & Resource Requirements (provide realistic cost projections, materials required, and duration of repairs based on civil engineering standard values).
4. Long-term Preventative Policy advice (how to solve this category of issues systemically in future municipal planning).

Live Ward 5 Dataset:
${issuesSummary}

Make your response highly actionable, analytical, professional, and visually formatted in markdown with bold lists and tables if appropriate. Keep it concise, engaging, and professional.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: query,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // lower temperature for precise analytical calculations
        tools: [{ googleSearch: {} }] // let it search standard structural repair costs or material specifications if needed
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks ? groundingChunks.map((chunk: any) => ({
      title: chunk.web?.title || "Web Resource",
      uri: chunk.web?.uri || "#"
    })).filter((s: any) => s.uri !== "#") : [];

    res.json({
      text: response.text || "No analysis generated.",
      sources: sources
    });

  } catch (error: any) {
    console.warn("Municipal AI query failed:", error.message || error);
    const fallbackResult = fallbackMunicipalQuery(query, issues);
    res.json(fallbackResult);
  }
});

// --- VITE MIDDLEWARE SETUP ---

async function startServer() {
  const server = http.createServer(app);

  // Initialize WebSocket server attached to the HTTP server
  wss = new WebSocketServer({ server });

  wss.on("connection", (socket) => {
    console.log("WebSocket Status: New client connection established.");
    
    // Send immediate confirmation to client
    socket.send(JSON.stringify({ type: "connection_established", message: "Connected to CivicHero Live Updates Engine" }));

    socket.on("message", (msg) => {
      console.log(`WebSocket Status: Message received from client -> ${msg}`);
    });

    socket.on("close", () => {
      console.log("WebSocket Status: Client connection terminated.");
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false, // Explicitly disable HMR to prevent WebSocket connection errors in AI Studio iframe
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Run the Gemini connection status probe asynchronously
  checkGeminiStatus().catch((e) => {
    console.error("Error running checkGeminiStatus:", e);
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
