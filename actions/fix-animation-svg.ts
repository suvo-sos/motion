import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";
import { animationOwnedBy, ownerFromCtx } from "../server/ownership";

export default defineAction({
  description: "Fix SVG issues in an animation (add viewBox if missing, ensure valid dimensions)",
  mcpTool: true,
  schema: z.object({
    id: z.string().describe("Animation ID to fix"),
  }),
  run: async ({ id }, ctx) => {
    const db = getDb();
    
    const [animation] = await db
      .select()
      .from(animations)
      .where(animationOwnedBy(id, ownerFromCtx(ctx)))
      .limit(1);
    
    if (!animation) {
      throw new Error(`Animation with id ${id} not found`);
    }
    
    let svg = animation.svg;
    const issues = [];
    let fixed = false;
    
    // Check if SVG is empty
    if (!svg || svg.trim() === '') {
      issues.push("SVG is empty - cannot fix");
      return { issues, fixed: false, svg };
    }
    
    // Check if SVG tag exists
    if (!svg.includes('<svg')) {
      issues.push("SVG missing <svg> tag - cannot fix");
      return { issues, fixed: false, svg };
    }
    
    // Check for viewBox
    if (!svg.includes('viewBox')) {
      issues.push("Missing viewBox - attempting to add default viewBox");
      
      // Try to extract width/height
      const widthMatch = svg.match(/width\s*=\s*["'](\d+(?:\.\d+)?)/);
      const heightMatch = svg.match(/height\s*=\s*["'](\d+(?:\.\d+)?)/);
      
      const width = widthMatch?.[1] ? parseFloat(widthMatch[1]) : 200;
      const height = heightMatch?.[1] ? parseFloat(heightMatch[1]) : 200;
      
      // Add viewBox after opening svg tag
      svg = svg.replace(
        /<svg([^>]*?)>/,
        `<svg$1 viewBox="0 0 ${width} ${height}">`
      );
      fixed = true;
    }
    
    // Check if width/height are 0 or missing
    const widthMatch = svg.match(/width\s*=\s*["'](\d+(?:\.\d+)?)/);
    const heightMatch = svg.match(/height\s*=\s*["'](\d+(?:\.\d+)?)/);
    
    if (!widthMatch || (widthMatch[1] && parseFloat(widthMatch[1]) === 0)) {
      issues.push("Missing or zero width - setting to 200");
      if (widthMatch) {
        svg = svg.replace(/width\s*=\s*["']\d+(?:\.\d+)?["']/, 'width="200"');
      } else {
        svg = svg.replace(/<svg/, '<svg width="200"');
      }
      fixed = true;
    }
    
    if (!heightMatch || (heightMatch[1] && parseFloat(heightMatch[1]) === 0)) {
      issues.push("Missing or zero height - setting to 200");
      if (heightMatch) {
        svg = svg.replace(/height\s*=\s*["']\d+(?:\.\d+)?["']/, 'height="200"');
      } else {
        svg = svg.replace(/<svg/, '<svg height="200"');
      }
      fixed = true;
    }
    
    // Update the database if we made changes
    if (fixed) {
      await db
        .update(animations)
        .set({ 
          svg,
          updatedAt: new Date().toISOString()
        })
        .where(eq(animations.id, id));
      
      return {
        fixed: true,
        issues,
        message: "SVG fixed successfully",
        svg: svg.substring(0, 500),
      };
    }
    
    return {
      fixed: false,
      issues: issues.length > 0 ? issues : ["No issues found"],
      svg: svg.substring(0, 500),
    };
  },
});
