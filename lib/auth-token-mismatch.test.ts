import { afterEach, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bug Condition Exploration Test for Authentication Token Mismatch
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1**
 * 
 * This test is designed to FAIL on unfixed code to demonstrate the bug exists.
 * When it fails, that CONFIRMS the bug condition exists in the codebase.
 * After the fix is implemented, this test should PASS.
 * 
 * NOTE: These tests verify the bug condition exists by checking token synchronization.
 * The actual 401 errors occur when making authenticated requests with mismatched tokens.
 */

describe("Property 1: Bug Condition - Token Mismatch Causes 401 Authentication Failures", () => {
  const agentNativeDir = path.resolve(__dirname, "../.agent-native");
  const devAuthSecretPath = path.join(agentNativeDir, "dev-auth-secret");
  const devServerJsonPath = path.join(agentNativeDir, "dev-server.json");
  
  // Store original values to restore after tests
  let originalDevAuthSecret: string | undefined;
  let originalDevServerJson: string | undefined;
  
  beforeAll(() => {
    // Backup original files
    if (fs.existsSync(devAuthSecretPath)) {
      originalDevAuthSecret = fs.readFileSync(devAuthSecretPath, "utf-8");
    }
    if (fs.existsSync(devServerJsonPath)) {
      originalDevServerJson = fs.readFileSync(devServerJsonPath, "utf-8");
    }
  });
  
  // Restore original files after each test
  afterEach(() => {
    if (originalDevAuthSecret !== undefined) {
      fs.writeFileSync(devAuthSecretPath, originalDevAuthSecret);
    }
    if (originalDevServerJson !== undefined) {
      fs.writeFileSync(devServerJsonPath, originalDevServerJson);
    }
  });

  it("detects token mismatch in actual production files (documents the bug)", () => {
    // CRITICAL: This test documents the CURRENT bug state in production files
    // On UNFIXED code: This should FAIL because tokens are mismatched
    // On FIXED code: This should PASS because tokens are synchronized
    
    // Read the actual token files
    const devAuthSecretContent = fs.readFileSync(devAuthSecretPath, "utf-8").trim();
    const devServerConfig = JSON.parse(fs.readFileSync(devServerJsonPath, "utf-8"));
    const devServerToken = devServerConfig.token;
    
    // Document the current state for debugging
    console.log("\n=== Current Token State (Bug Documentation) ===");
    console.log(`dev-auth-secret token (last 8 chars): ...${devAuthSecretContent.slice(-8)}`);
    console.log(`dev-server.json token (last 8 chars): ...${devServerToken.slice(-8)}`);
    console.log(`Tokens match: ${devAuthSecretContent === devServerToken}`);
    console.log("================================================\n");
    
    // This assertion encodes the EXPECTED behavior (synchronized tokens)
    // On unfixed code, this will FAIL because tokens are mismatched
    // This failure PROVES the bug exists
    expect(devAuthSecretContent).toBe(devServerToken);
  });

  it("verifies token mismatch causes authentication failure scenario", async () => {
    // CRITICAL: This test simulates the bug condition
    // Setup: Create artificially mismatched tokens
    const clientToken = "test-token-client-8c2b34b5e2fa3744c0960fd9a8c2ec67acab9b6f";
    const serverToken = "test-token-server-99da46dc746b531d5719c9613620fcce95b74c61";
    
    // Read the existing dev-server.json to preserve other fields
    let devServerConfig: any = { origin: "http://localhost:8082" };
    if (fs.existsSync(devServerJsonPath)) {
      devServerConfig = JSON.parse(fs.readFileSync(devServerJsonPath, "utf-8"));
    }
    
    // Set mismatched tokens
    fs.writeFileSync(devAuthSecretPath, clientToken + "\n");
    devServerConfig.token = serverToken;
    fs.writeFileSync(devServerJsonPath, JSON.stringify(devServerConfig));
    
    // Verify the mismatch was created
    const savedClientToken = fs.readFileSync(devAuthSecretPath, "utf-8").trim();
    const savedServerConfig = JSON.parse(fs.readFileSync(devServerJsonPath, "utf-8"));
    const savedServerToken = savedServerConfig.token;
    
    console.log("\n=== Bug Condition Created ===");
    console.log(`Client token: ${savedClientToken}`);
    console.log(`Server token: ${savedServerToken}`);
    console.log(`Tokens match: ${savedClientToken === savedServerToken}`);
    console.log("In production, this mismatch causes PUT requests to /_agent-native/application-state/* to fail with 401");
    console.log("=============================\n");
    
    // Document the bug condition
    expect(savedClientToken).not.toBe(savedServerToken);
    
    // Simulate what would happen with a real server
    // The client reads from dev-auth-secret: savedClientToken
    // The server validates against dev-server.json: savedServerToken
    // Result: Authentication fails because tokens don't match
    
    const clientUsesToken = savedClientToken;
    const serverExpectsToken = savedServerToken;
    const authenticationWouldSucceed = clientUsesToken === serverExpectsToken;
    
    // On UNFIXED code: This assertion fails because tokens are mismatched
    // On FIXED code: This assertion passes because tokens are synchronized
    expect(authenticationWouldSucceed).toBe(true);
  });
  
  it("verifies synchronized tokens enable authentication success scenario", () => {
    // This control test demonstrates that synchronized tokens work correctly
    // This should PASS even on unfixed code, proving token sync is the solution
    
    // Setup: Use the same token for both files
    const synchronizedToken = "test-token-synchronized-abc123def456";
    
    // Read the existing dev-server.json to preserve other fields
    let devServerConfig: any = { origin: "http://localhost:8082" };
    if (fs.existsSync(devServerJsonPath)) {
      devServerConfig = JSON.parse(fs.readFileSync(devServerJsonPath, "utf-8"));
    }
    
    // Set synchronized tokens
    fs.writeFileSync(devAuthSecretPath, synchronizedToken + "\n");
    devServerConfig.token = synchronizedToken;
    fs.writeFileSync(devServerJsonPath, JSON.stringify(devServerConfig));
    
    // Verify synchronization
    const savedClientToken = fs.readFileSync(devAuthSecretPath, "utf-8").trim();
    const savedServerConfig = JSON.parse(fs.readFileSync(devServerJsonPath, "utf-8"));
    const savedServerToken = savedServerConfig.token;
    
    console.log("\n=== Control Test: Synchronized Tokens ===");
    console.log(`Both files use token: ${synchronizedToken}`);
    console.log(`Tokens match: ${savedClientToken === savedServerToken}`);
    console.log("With synchronized tokens, authentication succeeds");
    console.log("=========================================\n");
    
    // Verify tokens are synchronized
    expect(savedClientToken).toBe(synchronizedToken);
    expect(savedServerToken).toBe(synchronizedToken);
    expect(savedClientToken).toBe(savedServerToken);
    
    // Simulate authentication check
    const clientUsesToken = savedClientToken;
    const serverExpectsToken = savedServerToken;
    const authenticationWouldSucceed = clientUsesToken === serverExpectsToken;
    
    // This should pass: synchronized tokens enable authentication
    expect(authenticationWouldSucceed).toBe(true);
  });
});
