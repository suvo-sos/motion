import { getDb } from "../server/db/index.js";
import { animations } from "../server/db/schema.js";

async function main() {
  const db = getDb();
  
  const allAnimations = await db.select().from(animations);
  
  console.log(`\n📊 Total animations: ${allAnimations.length}\n`);
  
  allAnimations.forEach((anim, idx) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Animation ${idx + 1}: ${anim.title}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`ID: ${anim.id}`);
    console.log(`Duration: ${anim.duration}ms`);
    console.log(`Loop: ${anim.loop}`);
    console.log(`Updated: ${anim.updatedAt}`);
    console.log(`\nSVG length: ${anim.svg.length} characters`);
    console.log(`SVG preview (first 200 chars):`);
    console.log(anim.svg.substring(0, 200));
    console.log(`\nTracks: ${anim.tracks.length} characters`);
    try {
      const tracks = JSON.parse(anim.tracks);
      console.log(`Parsed tracks: ${tracks.length} tracks`);
      tracks.forEach((track: any) => {
        console.log(`  - ${track.target}.${track.property}: ${track.keyframes.length} keyframes`);
      });
    } catch (e) {
      console.log(`❌ Error parsing tracks: ${e}`);
    }
    
    // Check for common issues
    const issues = [];
    if (!anim.svg || anim.svg.trim() === '') {
      issues.push('❌ SVG is empty');
    }
    if (!anim.svg.includes('<svg')) {
      issues.push('❌ SVG missing <svg> tag');
    }
    if (!anim.svg.includes('viewBox')) {
      issues.push('⚠️  SVG missing viewBox attribute');
    }
    
    if (issues.length > 0) {
      console.log(`\n🔍 Issues found:`);
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log(`\n✅ SVG looks valid`);
    }
  });
  
  console.log(`\n${'='.repeat(60)}\n`);
}

main().catch(console.error).finally(() => process.exit(0));
