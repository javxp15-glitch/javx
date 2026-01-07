
import fs from 'fs';
import path from 'path';
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

// Simple .env parser to avoid adding dependency
const envPath = path.resolve(process.cwd(), '.env');
console.log(`Loading env from: ${envPath}`);

if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} else {
    console.error("❌ .env file not found");
    process.exit(1);
}

async function checkR2() {
  console.log("Checking R2 Connection...");
  console.log("Endpoint:", process.env.R2_ENDPOINT);
  console.log("Bucket Target:", process.env.R2_BUCKET_NAME);

  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      console.error("❌ Missing environment variables");
      return;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    const command = new ListBucketsCommand({});
    const response = await client.send(command);
    console.log("✅ Connection Successful!");
    console.log("Buckets found:");
    response.Buckets?.forEach(b => console.log(` - ${b.Name}`));
    
    // Check if target bucket exists
    const targetBucket = response.Buckets?.find(b => b.Name === process.env.R2_BUCKET_NAME);
    if (targetBucket) {
        console.log(`✅ Target bucket '${process.env.R2_BUCKET_NAME}' found.`);
    } else {
        console.warn(`⚠️ Target bucket '${process.env.R2_BUCKET_NAME}' NOT found in account.`);
    }

  } catch (error) {
    console.error("❌ Connection Failed:", error);
  }
}

checkR2();
