# AdGenie - The "Robot Marketing Intern"

An AI-powered application that acts as a "marketing intern" for businesses big and small. AdGenie automatically generates posts and publishes hyper-relevant social media content to Instagram based on real-world triggers, like rain, sunny, weekend, payday, etc. customized and selected by the user.

## High-Level Architecture

This diagram illustrates the serverless architecture, with AWS Lambda, powering AdGenie.

![Architecture Diagram here](/AdGenie%20Architecture.jpg)

## How It Works (Detailed Workflow)

The platform operates in four distinct stages, from initial setup to final post.

**1. Onboarding & Configuration:**
A business owner signs up through the React frontend published and made available using _**AWS Amplify**_. A suite of RESTful Lambda functions exposed via API Gateway handles the core CRUD operations for their business profile, which is stored in **_AWS DynamoDB_.** To connect their social media, the user is guided through an OAuth 2.0 flow, where the `oauth_instagram_exchange` Lambda securely exchanges the authorization code for a long-lived Instagram API token, which is then encrypted and stored in the business's profile.

**2. Trigger Activation:**
After the businesses onboarding, they get to choose when should the app post. AdGenie's Lambda backend constantly monitors for opportunities based on these user-configured triggers. This is not a simple cron job, but a collection of specialized, event-driven processes made from different AWS Services like SQS, EventBridge and EventBridge Scheduler:
*   **Time-Based Triggers:** A scheduled Lambda, runs daily. It scans for users who have opted into time-based campaigns (like "Payday Sales" or "Weekend Specials"). When a relevant day is identified, it uses **_AWS EventBridge Scheduler_** to create a precise, one-off job to generate an ad at 10:00 AM in the business's local timezone.
*   **Weather-Based Triggers:** A more advanced scheduled Lambda, `check_weather`, runs periodically via Event Bridge Schedules. For each opted-in business, it does the following
    - fetches 30 days of historical weather data from the Open-Meteo API to establish a local baseline for "hot" or "cold".
    - It then analyzes the next 12-hour forecast for sustained conditions that match the business's preferences (e.g., "post when it's rainy").
    - If a valid event is detected within the business's operating hours, it schedules a targeted ad generation job via EventBridge Scheduler.
*   **On-Demand Triggers:** The user can manually trigger ad generation at any time through invoking the `ad_generation` lambda with prompt of their choice, perfect for flash sales or special announcements like Birthday sales, clearance sales, etc.

### Trigger Logic Deep Dive

Below is a closer look at the heuristics we are running inside our two scheduler Lambdas—`check_time_triggers` and `check_weather`.

#### **check_time_triggers (Time-Based Campaigns)**  
1. Invoked once every day by an EventBridge cron rule (we run it at 00:05 UTC).  
2. Scans DynamoDB for businesses whose `triggers.timeBased` object has at least one flag (`weekendSpecials` or `paydaySales`) set to `true`.  
3. Converts *today* into the business's local timezone (stored as an IANA tz string).  
4. Evaluates simple heuristics:  
   • `weekendSpecials` – fires when the local date is **Saturday or Sunday** (`weekday() ∈ {5, 6}`).  
   • `paydaySales`    – fires when the local day is **1st or 29th** of the month (`day ∈ {1, 15}`).  
5. For every satisfied rule a one-off EventBridge job is created that will invoke `bedrock_generate` at **10:00 AM local time** 
6. If for timezones <=UTC, 10AM will already be passed by 12:05AM UTC, so roll the post for them to the next day.
6. The schedule name is embedded in the event payload and appended to the business's `upcomingPosts` list so duplicate jobs are avoided.

#### **check_weather (Weather-Based Campaigns)**  
1. Runs every three hours.  
2. For every business with weather triggers enabled, the following comprehensive weather detection algorithm, that we are very proud of, is run:  
   1. Ensures latitude/longitude of the business are stored in database from onboarding;
    a. if missing they are resolved via Open-Meteo's geocoding API and cached.  
   2. Retrieves the last **30 days** of mean-daily temperature and computes: μ (mean) and σ (population std, floored at 0.5 °C).  
   3. Fetches the **next 12 hours** of hourly forecast (temperature °C & precipitation mm).  
   4. Slides a **2-hour window** (`MIN_CONSECUTIVE_HOURS = 2`) over the forecast to detect(We ensure a 2 hour window, to rule out spikes and dips in weather, which can be noisy and misleading):  
      • `coldWeather` – each hour in the window is cooler than μ − 1.5 σ.  
      • `hotWeather`  – each hour is warmer than μ + 1.5 σ.  
      • `rain`        – each hour has precipitation > 0.2 mm.  
   5. Windows and detections are discarded if the timestamps fall outside the business's `openTimeLocal`–`closeTimeLocal` range (overnight shifts handled). Since the business will not be open, it wouldn't make sense for business to post to come to their stores.
   6. Only triggers that map to the user's preferences (`coolPleasant`, `hotSunny`, `rainy`) are kept.  
   6. When the first valid window is found(within business hours & not noisy), an EventBridge one-off schedule is created at that hour, and an entry is added to `upcomingPosts` with full weather context.

3. Short Lambda runs plus one-off schedules keep the system completely serverless and highly scalable, even with thousands of businesses.

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

## AWS Lambda: The Core of AdGenie

The entire backend is built on AWS Lambda, which provides a powerful, event-driven, and scalable foundation. This serverless approach was chosen for several key advantages.

**Why Lambda is the Perfect Fit:**
*   **Event-Driven Architecture:** The application's workflow is naturally event-driven, making Lambda an ideal choice. Functions execute in response to specific triggers, creating a loosely coupled and highly resilient system.
*   **Cost-Efficiency:** We only pay for the compute time we consume. When no triggers are firing, the cost is near zero. This is far more economical than maintaining idle servers.
*   **Automatic Scaling:** Lambda automatically scales in response to the number of incoming events. Whether one business or one thousand businesses have triggers fire at the same time, the system scales seamlessly without any manual intervention.
*   **Reduced Operational Overhead:** By using Lambda, we eliminate the need to provision, manage, patch, or scale servers, allowing us to focus entirely on application logic.

### **Lambda Trigger Mechanisms in AdGenie:**

A total of 4 unique triggers were naturally required to be used by the problem statement:
We leverage multiple trigger types to create a flexible and responsive system:
*   **API Gateway:** Used for synchronous, user-facing RESTful API calls. This provides the interface for the frontend to manage business profiles, handle OAuth callbacks, and request on-demand ad generation.
*   **EventBridge Scheduler:** The backbone of our proactive marketing. We use it for both:
    *   **Cron Jobs:** Recurring schedules that invoke the `check_weather` and `check_time_triggers` functions.
    *   **One-Off Schedules:** Dynamically created schedules that invoke the `bedrock_generate` function at a precise future time for a specific business.
*   **SQS:** Used for asynchronous processing. It decouples the potentially long-running Instagram posting process from the content generation step, improving reliability and ensuring that generation requests aren't lost if posting fails.

### **Microservice Overview:**

Each Lambda function has a single, well-defined responsibility(atleast we tried to):
*   `business_create/read/update/delete`: A suite of standard CRUD APIs for managing business profiles.
*   `oauth_instagram_exchange`: Securely handles the Instagram OAuth 2.0 token exchange.
*   `ad_generation`: Handles on-demand, user-initiated ad generation.
*   `check_time_triggers`: Scans for and schedules time-based marketing events.
*   `check_weather`: Analyzes weather data and schedules weather-based marketing events.
*   `bedrock_generate`: The primary worker for generating ad content from scheduled triggers.
*   `post_to_instagram`: The final worker that consumes from the SQS queue and publishes content to Instagram.
*   `check_holidays` / `save_triggers`: *Currently non-operational placeholders from our initial thoughts but we were unable to implement in expected timeframe*

## Next Steps
*   **Implement Performance Dashboard:** Create a view for users to track the engagement and performance of their AI-generated posts.
*   **Develop Approval Workflow:** Build an optional workflow where users can approve or reject AI-generated content before it is automatically posted.
*   **Productionize Holiday Triggers:** Integrate a live holiday API and activate the `check_holidays` Lambda to enable marketing campaigns based on national or local holidays.
*   **Optimize Database Queries:** Implement a Global Secondary Index (GSI) on the `userId` attribute in the `Businesses` DynamoDB table. This will replace the inefficient `scan` operation in the `business_list` function with a highly-performant `query`, improving scalability.
*   **Integrate with 3rd-Party Data:** Connect to external data sources like Point-of-Sale (POS) or inventory management systems to create even more relevant triggers (e.g., "new product arrival" or "low stock sale").