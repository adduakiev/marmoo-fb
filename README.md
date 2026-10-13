<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Project documentation

- [MARMOO Reviews CRM](REVIEWS_CRM.md) — current architecture, manager workflow, API contract, tests, deployment and maintenance rules.
- [Reviews CRM rollout history](REVIEWS_CRM_ROLLOUT.md) — original investigation and production rollout notes.

View your app in AI Studio: https://ai.studio/apps/ec2771ae-d8cc-46f9-bf6c-f45190fcbfdb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
