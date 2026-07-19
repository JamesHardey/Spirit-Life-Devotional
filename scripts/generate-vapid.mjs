// Generates a VAPID keypair for Web Push and prints .env.local lines.
//   npm run generate-vapid
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\nVAPID keypair generated. Add these to .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:adefehintijames007@gmail.com\n");
