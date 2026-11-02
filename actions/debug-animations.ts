import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";

export default defineAction({
  description: "Debug all animations to see their SVG and data",
  mcpTool: true,
  readOnly: true,
  schema: z.object({}),
  run: async () => {
    const db = getDb();
    const allAnimations = await db.select().from(animations);
    
    const result = allAnimations.map((anim) => {
      const issues = [];
      if (!anim.svg || anim.svg.trim() === '') {
        issues.push('SVG is empty');
      }
      if (!anim.svg.includes('<svg')) {
        issues.push('SVG missing <svg> tag');
      }
      if (!anim.svg.includes('viewBox')) {
        issues.push('SVG missing viewBox attribute');
      }
      
      let parsedTracks = null;
      try {
        parsedTracks = JSON.parse(anim.tracks);
      } catch (e) {
        issues.push(`Error parsing tracks: ${e}`);
      }
      
      return {
        id: anim.id,
        title: anim.title,
        duration: anim.duration,
        loop: anim.loop,
        updatedAt: anim.updatedAt,
        svgLength: anim.svg.length,
        svgPreview: anim.svg.substring(0, 300),
        tracksCount: parsedTracks ? parsedTracks.length : 0,
        tracks: parsedTracks,
        issues: issues.length > 0 ? issues : null,
      };
    });
    
    return { animations: result };
  },
});
