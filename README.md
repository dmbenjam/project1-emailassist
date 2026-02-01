# Syracuse Alumni Email Draft Assistant

## Product Brief
The Alumni & Constituent Engagement (ACE) team writes a high volume of emails to invite audiences to events and encourage giving. Because the calls-to-action (RSVP, register, donate, share, etc.) are usually the same from campaign to campaign, the copywriting can get repetitive and time-consuming. This tool helps the team move through email building more quickly while adding more variety to text without losing the consistent, institutional tone expected for Syracuse University communications.

The target user is the ACE team at Syracuse University, but the same approach could be adapted for other alumni marketing teams by swapping in that institution’s voice guide and sample emails. In other words, the product is designed around a reusable pattern: structured inputs + curated voice context + quick iteration.

The website is effective because it supports team members who are not as savvy with AI prompting. Instead of asking users to “figure out the right prompt,” it provides guardrails through a clear form and a simple refinement box. Those constraints reduce ambiguity, improve consistency, and make it easier to produce usable drafts quickly.

## How to Use
- **Open the website** and go to **Step 1: Campaign Details**.
- **Enter required fields**: Campaign name, Audience, and Email length.
- **Adjust tone (optional)** using the sliders (formal/casual, serious/playful, reserved/enthusiastic).
- **Add additional context (optional)** such as key dates, location, urgency, giving link language, or required phrases.
- **Click “Generate Draft”** to receive subject line options and an email body draft.
- **Copy results** using **Copy Subject Lines** and **Copy Email Body**, then paste into your email platform.
- **Refine the draft** by typing a change request (e.g., “make it shorter,” “add urgency,” “more subject line options”) and clicking **Send**.
- **Start a new draft** with **Start Over**.

## Tech Stack
- Anthropic API
- AI coding assistants: Claude (initial prompt + feature ideation), Cursor (coding; model: GPT 5.2)
- Deployed on Vercel

## Reflections
I think I really benefitted from starting with Claude to help me build the initial prompt. It had some good ideas for features. I didn't use all of them in "version 1.0" but maybe they would be good to keep handy for user testing and improvement for version 2.0.

There were only a few things that didn't work like I expected. I thought it would be a good idea for this app to function and look like similar AI copywriting assistant products (e.g. Copy AI). So, I told Cursor to do just that. I'm not sure it succeeded in that, and I wonder if I should have been more specific or provided screenshots.

The most difficult part was integrating the Anthropic API. It did eventually work but it took hours of troubleshooting with Cursor to get there. As much of a pain as it was, along the way I got to learn how APIs work on a practical level.

As I mentioned, for version 2.0 I would want to do some user testing especially on how useful the field forms are on the initial page. Claude suggested keeping it to 5-6 fields. The tone sliders was one that barely made it off the chopping block. I question if it's actually helpful or if something different could take its place. I suspect the only way to know for sure would be to actually start using the tool on a regular basis, and ask a few colleagues to do the same.

API troubles aside, this was fun! I was intimidated by Cursor at first, but I'm excited to continue learning about it. Claude Code next!