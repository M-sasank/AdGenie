# AdGenie - The "Robot Marketing Intern"

An AI-powered application that acts as a "marketing intern" for businesses big and small. AdGenie automatically generates posts and publishes hyper-relevant social media content to Instagram based on real-world triggers, like weather, time based, etc. customized by the user.

### High-Level Architecture

This diagram illustrates the serverless architecture, with AWS Lambda, powering AdGenie.

![Architecture Diagram here]()

### How It Works (Detailed Workflow)

The platform operates in four distinct stages, from initial setup to final post.

**1. Onboarding & Configuration:**
A business owner signs up through the React frontend published and made available using _**AWS Amplify**_. A suite of RESTful Lambda functions exposed via API Gateway handles the core CRUD operations for their business profile, which is stored in **_AWS DynamoDB_.** To connect their social media, the user is guided through an OAuth 2.0 flow, where the `oauth_instagram_exchange` Lambda securely exchanges the authorization code for a long-lived Instagram API token, which is then encrypted and stored in the business's profile.

**2. Trigger Activation:**
After the businesses onboarding, they get to choose when should the app post. AdGenie's Lambda backend constantly monitors for opportunities based on these user-configured triggers. This is not a simple cron job, but a collection of specialized, event-driven processes made from different AWS Services like SQS, EventBridge and EventBridge Scheduler:
*   **Time-Based Triggers:** A scheduled Lambda, runs daily. It scans for users who have opted into time-based campaigns (like "Payday Sales" or "Weekend Specials"). When a relevant day is identified, it uses **_AWS EventBridge Scheduler_** to create a precise, one-off job to generate an ad at 10:00 AM in the business's local timezone.
*   **Weather-Based Triggers:** A more advanced scheduled Lambda, `check_weather`, runs every **three hours** via EventBridge Schedules. For each opted-in business, it does the following
    - fetches 30 days of historical weather data from the Open-Meteo API to establish a local baseline for "hot" or "cold".
    - It then analyzes the next **3-hour** forecast for sustained conditions that match the business's preferences (e.g., "post when it's rainy").
    - If a valid event is detected within the business's operating hours, it schedules a targeted ad generation job via EventBridge Scheduler.
*   **On-Demand Triggers:** The user can manually trigger ad generation at any time through invoking the `ad_generation` lambda with prompt of their choice, perfect for flash sales or special announcements like Birthday sales, clearance sales, etc.

**3. AI-Powered Generation:**
When a trigger fires—either from a scheduled job or an on-demand request—an AI worker Lambda (`bedrock_generate` or `ad_generation`) is invoked. This function:
1.  Constructs a detailed prompt based on the business's profile stored in AWS DynamoDB (brand voice, products) and the specific trigger (e.g., "Rainy day special") from AWS SQS or AWS EventBridge.
2.  Uses Amazon Bedrock's Titan models(text-premier for caption, image v2 for posts) to generate a unique, on-brand caption and a compelling visual.
3.  Uploads the generated image to a private S3 bucket.
4.  Places a message containing the caption and a presigned URL for the image into an SQS queue, _making the entire system decoupled and ready under loads!_

**4. Automated Instagram Posting:**
The SQS queue decouples generation from the final posting. The `post_to_instagram` Lambda is triggered by a new message in the AWS SQS queue. This function handles the complex, asynchronous process of publishing to the Instagram Graph API:
1.  It creates a media container on Instagram with the image URL.
2.  It polls Instagram with exponential backoff, waiting for the container to be processed.
3.  Once ready, it publishes the container, making the post live.
4.  Finally, it retrieves the post's permalink and updates the business's record in DynamoDB with a history of the post.

### AWS Lambda: The Core of AdGenie

The entire backend is built on AWS Lambda, which provides a powerful, event-driven, and scalable foundation. This serverless approach was chosen for several key advantages.

**Why Lambda is the Perfect Fit:**
*   **Event-Driven Architecture:** The application's workflow is naturally event-driven, making Lambda an ideal choice. Functions execute in response to specific triggers, creating a loosely coupled and highly resilient system.
*   **Cost-Efficiency:** We only pay for the compute time we consume. When no triggers are firing, the cost is near zero. This is far more economical than maintaining idle servers.
*   **Automatic Scaling:** Lambda automatically scales in response to the number of incoming events. Whether one business or one thousand businesses have triggers fire at the same time, the system scales seamlessly without any manual intervention.
*   **Reduced Operational Overhead:** By using Lambda, we eliminate the need to provision, manage, patch, or scale servers, allowing us to focus entirely on application logic.

**Lambda Trigger Mechanisms in AdGenie:**

A total of 4 unique triggers were naturally required to be used by the problem statement:
We leverage multiple trigger types to create a flexible and responsive system:
*   **API Gateway:** Used for synchronous, user-facing RESTful API calls. This provides the interface for the frontend to manage business profiles, handle OAuth callbacks, and request on-demand ad generation.
*   **EventBridge Scheduler:** The backbone of our proactive marketing. We use it for both:
    *   **Cron Jobs:** Recurring schedules that invoke the `check_weather` and `check_time_triggers` functions.
    *   **One-Off Schedules:** Dynamically created schedules that invoke the `bedrock_generate` function at a precise future time for a specific business.
*   **SQS:** Used for asynchronous processing. It decouples the potentially long-running Instagram posting process from the content generation step, improving reliability and ensuring that generation requests aren't lost if posting fails.

**Microservice Overview:**

Each Lambda function has a single, well-defined responsibility(atleast we tried to):
*   `business_create/read/update/delete`: A suite of standard CRUD APIs for managing business profiles.
*   `oauth_instagram_exchange`: Securely handles the Instagram OAuth 2.0 token exchange.
*   `ad_generation`: Handles on-demand, user-initiated ad generation.
*   `check_time_triggers`: Scans for and schedules time-based marketing events.
*   `check_weather`: Analyzes **3-hour** weather forecasts and schedules weather-based marketing events.
*   `bedrock_generate`: The primary worker for generating ad content from scheduled triggers.
*   `post_to_instagram`: The final worker that consumes from the SQS queue and publishes content to Instagram.
*   `check_holidays` / `save_triggers`: *Currently non-operational placeholders from our initial thoughts but we were unable to implement in expected timeframe*

### Next Steps
*   **Implement Performance Dashboard:** Create a view for users to track the engagement and performance of their AI-generated posts.
*   **Develop Approval Workflow:** Build an optional workflow where users can approve or reject AI-generated content before it is automatically posted.
*   **Productionize Holiday Triggers:** Integrate a live holiday API and activate the `check_holidays` Lambda to enable marketing campaigns based on national or local holidays.
*   **Optimize Database Queries:** Implement a Global Secondary Index (GSI) on the `userId` attribute in the `Businesses` DynamoDB table. This will replace the inefficient `scan` operation in the `business_list` function with a highly-performant `query`, improving scalability.
*   **Integrate with 3rd-Party Data:** Connect to external data sources like Point-of-Sale (POS) or inventory management systems to create even more relevant triggers (e.g., "new product arrival" or "low stock sale").

### AWS Services Used

- **Amazon API Gateway** – Provides the REST interface that fronts all synchronous Lambda calls, enabling secure, scalable HTTP access for the frontend.
- **AWS Lambda** – Serverless execution environment for every micro-service function in the backend.
- **Amazon EventBridge**
  - *Rule Scheduler* – Drives recurring cron jobs (`check_time_triggers`, `check_weather`).
  - *EventBridge Scheduler* – Creates one-off, time-targeted invocations of `bedrock_generate`.
- **Amazon SQS** – Decouples AI generation from the posting workflow via the `ad_content_queue`.
- **Amazon S3** – Stores Titan-generated images and serves presigned URLs to Instagram.
- **Amazon DynamoDB** – Persists business profiles, trigger settings, and posting history.
- **Amazon Bedrock** – Hosts Titan text and image models used by `bedrock_generate` and `ad_generation`.
- **AWS CloudWatch Logs** – Captures logs from every Lambda invocation for debugging and monitoring.
- **AWS IAM** – Enforces least-privilege access between services (e.g., Scheduler → Lambda, Lambda → S3).
- **AWS SAM** – Infrastructure-as-code tool used to define, deploy, and update the entire serverless stack.

### External / Non-AWS Services & Tools

- **Instagram Graph API** – Publishes media and retrieves user profile data.
- **Open-Meteo API** – Supplies real-time forecasts, historical averages, and geocoding for the weather-trigger engine.
- **draw.io / diagrams.net** – Used to create the architecture diagrams (design-time only).
- **React (Vite + TypeScript)** – Front-end framework powering the single-page application.
- **Tailwind CSS & shadcn/ui** – Utility-first CSS and component libraries for styling the frontend.
- **Bun / npm** – JavaScript build and dependency tooling for the frontend and serverless functions.