
// Simulation of the logic in lib/domain-security.ts

function check(allowedDomains: string[], requestingDomain: string) {
    console.log(`Checking requesting: "${requestingDomain}" against allowed: ${JSON.stringify(allowedDomains)}`);
    
    // Logic from line 41-49
    const result = allowedDomains.some((allowedDomain) => {
      const normalizedRequesting = requestingDomain.replace(/^www\./, "")
      const normalizedAllowed = allowedDomain.replace(/^www\./, "")
      return normalizedRequesting === normalizedAllowed
    });
    
    console.log(`Result: ${result}`);
}

console.log("--- Test 1: Empty whitelist ---");
check([], "example.com");

console.log("--- Test 2: Match ---");
check(["example.com"], "example.com");

console.log("--- Test 3: No Match ---");
check(["google.com"], "example.com");

console.log("--- Test 4: WWW normalization ---");
check(["www.example.com"], "example.com");
check(["example.com"], "www.example.com");
