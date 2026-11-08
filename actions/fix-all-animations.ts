import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../server/db";
import { animations } from "../server/db/schema";
import { ownedBy, ownerFromCtx } from "../server/ownership";

export default defineAction({
  description: "Remove script tags from ALL animations to fix rendering issues",
  mcpTool: true,
  schema: z.object({}),
  run: async (_input, ctx) => {
    const db = getDb();
    
    // Get all animations owned by this browser
    const allAnimations = await db
      .select()
      .from(animations)
      .where(ownedBy(ownerFromCtx(ctx)) ?? sql`TRUE`);
    
    const results = [];
    let fixedCount = 0;
    
    for (const animation of allAnimations) {
      let svg = animation.svg;
      const hasScripts = svg.includes('<script');
      
      if (hasScripts) {
        const originalLength = svg.length;
        
        // Remove all script tags and their content
        svg = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        svg = svg.replace(/<script[^>]*>/gi, '');
        svg = svg.replace(/<\/script>/gi, '');
        
        const removedBytes = originalLength - svg.length;
        
        // Update the database
        await db
          .update(animations)
          .set({ 
            svg,
            updatedAt: new Date().toISOString()
          })
          .where(eq(animations.id, animation.id));
        
        results.push({
          id: animation.id,
          title: animation.title,
          fixed: true,
          removedBytes,
        });
        fixedCount++;
      } else {
        results.push({
          id: animation.id,
          title: animation.title,
          fixed: false,
          message: "No script tags found",
        });
      }
    }
    
    return {
      totalAnimations: allAnimations.length,
      fixedCount,
      results,
      message: fixedCount > 0 
        ? `Fixed ${fixedCount} animation(s) by removing script tags` 
        : "No animations needed fixing",
    };
  },
});
