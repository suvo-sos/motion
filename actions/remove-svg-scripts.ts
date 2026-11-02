import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";

export default defineAction({
  description: "Remove script tags from an animation's SVG to fix rendering issues",
  mcpTool: true,
  schema: z.object({
    id: z.string().describe("Animation ID to fix"),
  }),
  run: async ({ id }) => {
    const db = getDb();
    
    const [animation] = await db
      .select()
      .from(animations)
      .where(eq(animations.id, id))
      .limit(1);
    
    if (!animation) {
      throw new Error(`Animation with id ${id} not found`);
    }
    
    let svg = animation.svg;
    const originalLength = svg.length;
    
    // Check if there are script tags
    const hasScripts = svg.includes('<script');
    
    if (!hasScripts) {
      return {
        fixed: false,
        message: "No script tags found in SVG",
      };
    }
    
    // Remove all script tags and their content
    svg = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Also remove any standalone script tags
    svg = svg.replace(/<script[^>]*>/gi, '');
    svg = svg.replace(/<\/script>/gi, '');
    
    const removedCount = originalLength - svg.length;
    
    // Update the database
    await db
      .update(animations)
      .set({ 
        svg,
        updatedAt: new Date().toISOString()
      })
      .where(eq(animations.id, id));
    
    return {
      fixed: true,
      message: `Removed script tags from SVG (${removedCount} characters removed)`,
      hadScripts: hasScripts,
      bytesRemoved: removedCount,
    };
  },
});
