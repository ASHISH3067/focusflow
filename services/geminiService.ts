
import { GoogleGenAI, Type } from "@google/genai";
import { Task, TimeLog } from "../types";
import { msToHours } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getFocusCoachAdvice(tasks: Task[], logs: TimeLog[]) {
  const summary = tasks.map(t => {
    const totalMs = logs
      .filter(l => l.taskId === t.id && l.endTs)
      .reduce((acc, curr) => acc + (curr.endTs! - curr.startTs), 0);
    return {
      name: t.name,
      goal: t.hoursGoal,
      actual: msToHours(totalMs),
      remaining: msToHours(t.remainingMs)
    };
  });

  const prompt = `Act as a professional focus coach. Here are my focus tasks and progress today:
  ${JSON.stringify(summary)}
  
  Provide a short (max 2 sentences), encouraging productivity tip based on this data. If I'm doing well, celebrate. If I'm behind on goals, give a small tip to restart.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Coach error:", error);
    return "Keep going! Small steps lead to big achievements.";
  }
}
