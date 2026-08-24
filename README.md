FraudShield
Real-Time Fraud Detection, Explainability & Model Monitoring

FraudShield is an end-to-end real-time fraud detection and monitoring platform built to demonstrate how a machine learning fraud model can be integrated into a live event-driven application.

The project combines machine learning, Apache Kafka, PostgreSQL, FastAPI, Server-Sent Events, React, Docker, and model explainability to create a complete fraud monitoring workflow.

The goal of FraudShield is not simply to answer:

"Is this transaction fraudulent?"

Instead, the system is designed to answer the questions that come after the prediction:

What transactions are arriving right now?
Which transactions are suspicious?
How confident is the model?
Why did the model consider a transaction suspicious?
How severe is the alert?
How many transactions and alerts are being generated?
What happens if the fraud threshold changes?
Is the model's behavior changing over time?
Can an analyst investigate a suspicious transaction?
Can the entire pipeline run continuously without manual intervention?

FraudShield connects all of these pieces into a single application.

Table of Contents
Overview
Problem Statement
What FraudShield Does
Architecture
End-to-End Data Flow
Core Components
Transaction Producer
Kafka Streaming
Real-Time Stream Processor
Machine Learning
Fraud Probability
Threshold Control
Alert Severity
Model Explainability
Drift Monitoring
PostgreSQL
FastAPI Backend
Server-Sent Events
React Dashboard
Dashboard Features
Alert Investigation
Docker Environment
Project Structure
API Reference
Running the Project
Useful Commands
Design Decisions
Engineering Challenges
Limitations
Future Improvements
Technology Stack
Project Status
License
Author
Overview

FraudShield is structured as a real-time event processing system.

Transactions are continuously generated and published to Kafka. The stream processor consumes those events and passes them through the fraud detection model.

For every transaction, the system can determine:

fraud probability
whether the probability crosses the active threshold
alert severity
important model features
SHAP feature contributions
runtime model statistics

Alerts are persisted in PostgreSQL, while the FastAPI backend exposes the information to the React dashboard.

The dashboard then presents the information in a form that is useful for monitoring and investigation.

The complete flow is:

Transaction
|
v
Producer
|
v
Kafka
|
v
Stream Processor
|
+----------------------+
| |
v v
ML Prediction Model Monitoring
|
+----------------------+
| | |
v v v
Probability Severity SHAP
| | |
+----------+-----------+
|
v
PostgreSQL
|
v
FastAPI
|
v
Server-Sent Events
|
v
React Dashboard
|
v
Analyst Investigation

Problem Statement

Fraud detection is often presented as a machine learning classification problem.

A model receives transaction features and returns a prediction.

That is useful, but it is only one part of a real fraud monitoring system.

Suppose the model returns:

Fraud probability: 0.99997

An analyst still needs to know:

Which transaction?
Which customer?
Which merchant?
Which location?
Which device?
Why was it considered risky?
How severe is the alert?
What other transactions are being flagged?
Is the model behaving normally?

A real fraud monitoring system therefore needs more than a classifier.

It needs an entire path from incoming event to human-readable investigation.

FraudShield was built around that idea.

What FraudShield Does

The application provides a complete demonstration of a real-time fraud monitoring workflow.

Data ingestion

Transactions are continuously produced and sent to Kafka.

Event streaming

Kafka provides the communication layer between transaction generation and fraud processing.

Machine learning

The stream processor evaluates transactions using the trained model.

Risk scoring

Each transaction receives a fraud probability between 0 and 1.

Threshold-based decisions

The active threshold determines whether the transaction becomes an alert.

Severity classification

Alerts are categorized as LOW, MEDIUM, HIGH, or CRITICAL.

Explainability

SHAP values identify features that contributed to the model's prediction.

Persistence

Alerts are stored in PostgreSQL.

Monitoring

The system tracks model behavior and exposes drift-related statistics.

Live dashboard

React displays the system state and receives live updates through SSE.

Investigation

An analyst can select an alert and inspect its transaction details and model explanation.

Architecture

FraudShield uses a service-oriented architecture running through Docker Compose.

                     FRAUDSHIELD
                          |
                          v
              +-----------------------+
              | Transaction Producer  |
              +-----------+-----------+
                          |
                          v
              +-----------------------+
              |        Kafka          |
              |   transactions topic  |
              +-----------+-----------+
                          |
                          v
              +-----------------------+
              |   Stream Processor    |
              |                       |
              | ML Prediction         |
              | Threshold Decision     |
              | Severity              |
              | SHAP                  |
              | Drift Monitoring      |
              +-----------+-----------+
                          |
                +---------+---------+
                |                   |
                v                   v
      +------------------+   +------------------+
      |    PostgreSQL    |   | Runtime Metrics  |
      |   Alert Store    |   | & State Files    |
      +---------+--------+   +------------------+
                |
                v
      +------------------+
      |     FastAPI      |
      |   REST + SSE     |
      +---------+--------+
                |
                v
      +------------------+
      | React Dashboard  |
      +------------------+

The local environment also includes Adminer for inspecting the PostgreSQL database and Zookeeper for the Kafka setup.

End-to-End Data Flow

A transaction moves through the system in the following order:

Transaction data
Producer
Kafka topic
Stream processor
Feature preparation
ML prediction
Fraud probability
Threshold decision
Severity classification
SHAP explanation
Drift monitoring
Database persistence
FastAPI
Server-Sent Events
React dashboard
Analyst investigation

This separation keeps the different responsibilities independent.

The producer does not need to know anything about the dashboard.

The dashboard does not need to know how the model is implemented.

The stream processor does not need to know how the frontend is rendered.

Each service has a defined role.

Core Components
Service	Responsibility
Producer	Generates and publishes transactions
Kafka	Transports transaction events
Stream Processor	Performs ML inference and fraud processing
PostgreSQL	Stores persistent alerts
FastAPI	Provides REST and streaming APIs
React UI	Provides the monitoring interface
Adminer	Database inspection
Zookeeper	Kafka coordination
Transaction Producer

Location:

services/producer/

The producer continuously reads transaction data and publishes events to Kafka.

The producer can be configured through environment variables such as:

KAFKA_BROKER
TOPIC_TRANSACTIONS
PRODUCER_RATE_MS
REPEAT
DATA_FILE
SAMPLE_SIZE
FRAUD_RATIO

This allows the transaction source to be changed without modifying the downstream fraud detection system.

The producer is intentionally kept separate from the model processing layer.

This makes the architecture easier to extend later with other event sources such as:

payment gateways
REST webhooks
message queues
database change streams
external transaction APIs
Kafka Streaming

Kafka provides the event transport layer.

The primary topic used by FraudShield is:

transactions

The producer publishes transaction events to this topic.

The stream processor subscribes to the topic and continuously consumes the events.

The architecture therefore becomes:

Producer
|
v
Kafka
|
v
Stream Processor

This event-driven design prevents the transaction generator and fraud processor from being tightly coupled.

Real-Time Stream Processor

Location:

services/stream_processor/

The stream processor is the core processing service.

Its responsibilities include:

connecting to Kafka
consuming transaction events
preparing model features
loading the trained model
calculating fraud probability
applying the active threshold
determining severity
generating SHAP explanations
tracking drift metrics
writing transaction data
writing alerts
storing alerts in PostgreSQL

The processing loop can be simplified to:

Kafka Event
|
v
Parse Record
|
v
Prepare Features
|
v
ML Model
|
v
Fraud Probability
|
+-------------------+
| |
v v
Threshold Severity
Decision Classification
| |
+---------+---------+
|
v
SHAP Explanation
|
v
Drift Monitoring
|
v
Persist Results

The stream processor is designed to remain active continuously.

Machine Learning

The machine learning model is responsible for producing a fraud probability for each transaction.

The model receives the transaction features and produces a score representing the model's estimated fraud risk.

The system ensures that the resulting probability remains within the valid range:

0.0 <= probability <= 1.0

This probability becomes the foundation for:

threshold decisions
severity classification
dashboard visualizations
fraud summaries
investigation information
model monitoring
Fraud Probability

A continuous probability makes the system more flexible.

For example:

0.20

represents a much lower model score than:

0.95

The threshold determines how the score is operationally interpreted.

For example, if:

threshold = 0.80

then:

probability = 0.72

does not trigger an alert.

But:

probability = 0.92

does.

The model itself has not changed.

Only the operational decision boundary has changed.

Threshold Control

FraudShield keeps the threshold separate from the machine learning model.

This is important because the best threshold depends on how sensitive the system should be.

A lower threshold means:

Lower threshold
|
v
More transactions flagged
|
v
Higher sensitivity

A higher threshold means:

Higher threshold
|
v
Fewer transactions flagged
|
v
More conservative detection

The React dashboard provides a live threshold slider.

The threshold is sent to the FastAPI backend and persisted so that the stream processor uses the same value.

The flow is:

React Dashboard
|
v
FastAPI
|
v
threshold.json
|
v
Stream Processor

The dashboard also displays a recommended threshold for reference.

Alert Severity

FraudShield adds a severity layer on top of the fraud probability.

The current classification is:

Fraud Probability	Severity
>= 0.95	CRITICAL
>= 0.80	HIGH
>= 0.50	MEDIUM
< 0.50	LOW

For example:

Probability: 0.99997
Severity: CRITICAL

This makes the alert queue easier to prioritize.

Instead of forcing an analyst to interpret every probability manually, the system provides a clear severity level.

Model Explainability

One of the main goals of FraudShield is to make the ML output easier to understand.

A fraud prediction without an explanation can be difficult to investigate.

FraudShield therefore stores SHAP-based feature contributions with alerts.

A typical explanation may contain values such as:

V14 +4.3132
V4 +1.7852
V10 +1.2567
V12 +1.0949
V17 +0.6220

Positive contributions push the model toward a higher fraud prediction.

Negative contributions push the model toward a lower fraud prediction.

The dashboard displays the most important model drivers for each alert.

This creates a much more useful investigation workflow:

Transaction
|
v
Fraud Probability
|
v
Why?
|
v
SHAP Feature Contributions

Drift Monitoring

A fraud model can behave differently as incoming data changes.

For example, transaction behavior may change because of:

new merchants
new devices
changing customer behavior
different transaction amounts
seasonal patterns
new fraud strategies

FraudShield therefore includes lightweight runtime monitoring.

The system tracks values such as:

window size
drift ratio
rolling alert rate
baseline fraud rate
mean score
P95 score
drift status

The dashboard displays these values under the Model Intelligence section.

The monitoring layer is intended to provide an operational indication of how the model is behaving rather than replace a dedicated enterprise ML monitoring platform.

Model Metadata

FraudShield also exposes model metadata to the dashboard.

The model panel can display:

model name
F1 score
PR-AUC
training samples
test samples
model threshold
fraud rate

This gives the user context about the model currently driving the live predictions.

It also separates model-level information from transaction-level information.

PostgreSQL

PostgreSQL provides persistent storage for fraud alerts.

The alert table contains information including:

ts
prob
amount
transaction_id
customer_id
merchant
location
device_id
severity
features
shap

A stored alert can therefore contain the complete context needed for investigation.

For example:

Transaction ID : TXN-DD0D8AA753
Customer : CUS-1008
Merchant : Flipkart
Location : Kolkata
Device : DEV-2003
Probability : 0.9999747991
Severity : CRITICAL

The feature values and SHAP explanation are also associated with the alert.

This makes the database useful as a persistent investigation store rather than simply a transaction counter.

FastAPI Backend

Location:

services/api/

FastAPI acts as the bridge between the processing system and the React dashboard.

The backend provides:

health checks
transaction data
alert data
alert counts
threshold management
model metadata
drift information
transaction streaming
alert streaming

The backend can query PostgreSQL for alert information while also serving runtime files and monitoring state.

REST API
Health Check

GET /health

Example response:

{
"ok": true
}

Transactions

GET /transactions?limit=200

Returns recent transaction data.

Alerts

GET /alerts?limit=200

Returns recent fraud alerts.

Example structure:

[
{
"ts": 1787610343000,
"prob": 0.9999747991,
"amount": 1.0,
"transaction_id": "TXN-DD0D8AA753",
"customer_id": "CUS-1008",
"merchant": "Flipkart",
"location": "Kolkata",
"device_id": "DEV-2003",
"severity": "CRITICAL",
"features": {},
"shap": []
}
]

Counts

GET /counts

Returns:

total transactions
total alerts

These values power the dashboard KPI cards.

Threshold

Get the current threshold:

GET /threshold

Update the threshold:

POST /threshold/{value}

Example:

curl -X POST http://127.0.0.1:8000/threshold/0.70

Model

GET /model

Returns model metadata.

Drift

GET /drift

Returns current drift and runtime model statistics.

Server-Sent Events

FraudShield uses Server-Sent Events to support live dashboard updates.

The API provides:

GET /stream/transactions

and:

GET /stream/alerts

The React application subscribes to these endpoints.

When transaction or alert data changes, the backend emits an update event and the frontend refreshes its dashboard data.

This allows the dashboard to stay current without requiring the user to manually refresh the browser.

React Dashboard

Location:

services/ui/

The frontend uses:

React
Vite
Tailwind CSS
Axios
Recharts

The UI is designed around monitoring and investigation rather than simply displaying raw API responses.

The dashboard provides a single place to view:

System Activity
+
Fraud Risk
+
Model Performance
+
Drift
+
Alerts
+
Investigation Details

Dashboard Features
Overview KPI Cards

The top section provides a quick summary of the current system state.

It displays:

Total Transactions
Total Alerts
Alert Rate
Risk Threshold

This gives the user an immediate overview before they start investigating individual alerts.

Recent Transaction Risk

The transaction risk chart displays recent fraud probabilities.

The visualization makes it possible to see how model scores are changing across incoming transactions.

The active threshold provides context for understanding which transactions are likely to become alerts.

The chart also includes transaction information through its tooltip.

Fraud vs Normal

The Fraud vs Normal panel provides a visual summary of recent transactions according to the active threshold.

This is particularly useful when changing the threshold.

For example, lowering the threshold should cause more recent transactions to be considered risky.

The chart therefore provides a visual way to understand the operational effect of threshold changes.

Model Performance

The Model Intelligence section displays model-level information such as:

F1 Score
PR-AUC
Training Samples
Test Samples
Model Threshold
Fraud Rate

This keeps model quality visible alongside the live application.

Drift Monitoring

The dashboard displays:

Window Size
Drift Ratio
Rolling Alert Rate
Baseline Fraud Rate
Mean Score
P95 Score

The current drift status is also highlighted.

This gives the user a quick indication of whether the model's recent behavior is within the expected range.

Recent Alerts

The alert table displays recent fraud alerts with information such as:

timestamp
probability
amount
merchant
location
severity
top model drivers

The table is intended to act as the main investigation queue.

Alert Investigation

Clicking an alert opens an investigation panel.

The panel displays transaction context including:

Transaction ID
Customer
Merchant
Location
Device
Amount
Time

It also displays:

Fraud Probability

and a visual probability bar.

The alert's SHAP contributions are shown below the probability.

For example:

V14 +4.3132
V4 +1.7852
V10 +1.2567
V12 +1.0949
V17 +0.6220

The interface explains that positive contributions push the model toward higher fraud probability while negative contributions push it toward lower probability.

This allows the user to move from:

"Something looks suspicious."

to:

"Here is the transaction."
"Here is the risk score."
"Here is the severity."
"Here are the features influencing the model."

That is one of the main purposes of the dashboard.

Docker Environment

The entire application is designed to run through Docker Compose.

The stack contains:

zookeeper
kafka
postgres
adminer
producer
stream_processor
api
webhook
ui

Docker provides isolated environments for the individual services and makes the local development setup reproducible.

The main application services communicate using the Docker Compose network.

For example:

producer
|
+--> kafka:9092

stream_processor
|
+--> kafka:9092
|
+--> postgres:5432

api
|
+--> postgres:5432

ui
|
+--> localhost:8000

Project Structure

fraudshield/
|
├── data/
│ ├── transactions.csv
│ ├── alerts.csv.sample
│ └── latest.csv.sample
│
├── infra/
│ └── postgres/
│ └── init.sql
│
├── services/
│ |
│ ├── api/
│ │ ├── main.py
│ │ ├── Dockerfile
│ │ └── requirements.txt
│ │
│ ├── producer/
│ │ ├── producer.py
│ │ ├── webhook_api.py
│ │ ├── Dockerfile
│ │ └── requirements.txt
│ │
│ ├── stream_processor/
│ │ ├── app.py
│ │ ├── train.py
│ │ ├── Dockerfile
│ │ └── requirements.txt
│ │
│ └── ui/
│ ├── src/
│ │ ├── App.jsx
│ │ ├── lib/
│ │ └── components/
│ │ ├── AlertsTable.jsx
│ │ ├── FraudSummary.jsx
│ │ ├── KpiCard.jsx
│ │ ├── ModelDriftPanel.jsx
│ │ ├── ThresholdControl.jsx
│ │ └── TxnChart.jsx
│ │
│ ├── Dockerfile
│ ├── package.json
│ └── vite.config.js
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md

API Reference
Endpoint	Method	Purpose
/health	GET	API health check
/transactions	GET	Recent transactions
/alerts	GET	Recent alerts
/counts	GET	Transaction and alert counts
/threshold	GET	Current threshold
/threshold/{value}	POST	Update threshold
/model	GET	Model metadata
/drift	GET	Drift metrics
/stream/transactions	GET	Live transaction updates
/stream/alerts	GET	Live alert updates
Running the Project
Requirements

The primary requirement is:

Docker Desktop

Git is required to clone the repository.

The application is intended to run through Docker Compose.

Clone the Repository

git clone https://github.com/<your-username>/fraudshield.git

cd fraudshield

Environment Configuration

Copy the example environment file.

On Git Bash:

cp .env.example .env

On PowerShell:

Copy-Item .env.example .env

The .env.example file contains the configuration used for local development.

Do not commit private credentials or secrets.

Start the Application

docker compose up -d

Docker Compose will start the required services.

Check the Containers

docker compose ps

The services should report as running.

Check the API

curl http://127.0.0.1:8000/health

Expected response:

{
"ok": true
}

Check Alerts

curl "http://127.0.0.1:8000/alerts?limit=1"

A generated alert should contain fields such as:

transaction_id
prob
amount
merchant
location
device_id
severity
features
shap

Open the Dashboard

http://localhost:5173

The producer should generate transactions and the stream processor should process them continuously.

Adminer

Adminer is included for database inspection during development.

Open:

http://localhost:8080

The PostgreSQL server is available inside the Docker network as:

postgres

and is exposed locally on:

localhost:5432

Adminer is not required for normal application operation.

Useful Commands
Start the stack

docker compose up -d

Stop the stack

docker compose down

Rebuild a service

docker compose build <service>

For example:

docker compose build stream_processor

Restart a service

docker compose restart <service>

View all containers

docker compose ps

View service logs

docker compose logs --tail=50 <service>

Follow logs

docker compose logs -f <service>

Useful Health Checks
API

curl http://127.0.0.1:8000/health

Alerts

curl "http://127.0.0.1:8000/alerts?limit=1"

Transactions

curl "http://127.0.0.1:8000/transactions?limit=5"

Counts

curl http://127.0.0.1:8000/counts

Threshold

curl http://127.0.0.1:8000/threshold

Model

curl http://127.0.0.1:8000/model

Drift

curl http://127.0.0.1:8000/drift

Inspecting PostgreSQL

To inspect the alerts table directly:

docker compose exec postgres psql -U fraud -d frauddb

Inside PostgreSQL:

\d alerts

To view recent alerts:

SELECT
ts,
prob,
severity,
transaction_id,
merchant
FROM alerts
ORDER BY ts DESC
LIMIT 10;

This is useful for verifying that data generated by the stream processor is reaching the persistent database.

Design Decisions
Why Kafka?

Transactions are naturally represented as events.

Kafka creates a clear boundary between transaction generation and transaction processing.

The producer can publish events without knowing how the ML system processes them.

The stream processor can consume events without caring where they originated.

This makes the system easier to extend.

Why PostgreSQL?

Fraud alerts need to remain available after they have been generated.

PostgreSQL provides a structured and persistent store that can be queried independently from Kafka.

It also makes investigation data easier to retrieve through the API.

Why FastAPI?

The stream processor and machine learning components are Python-based.

FastAPI fits naturally into the architecture and provides a simple way to expose both REST endpoints and SSE streams.

Why Server-Sent Events?

The dashboard primarily needs updates from the backend to the browser.

SSE is therefore a good fit.

The application does not require the full bidirectional communication model of WebSockets for its current live update requirements.

Why SHAP?

A model prediction alone does not explain a decision.

SHAP provides feature-level contributions that can be displayed to an analyst.

This makes the system more useful for investigation and demonstrates an important part of responsible ML deployment.

Why a Separate Threshold?

The model probability and the operational alert decision are different concepts.

Keeping the threshold separate allows the system's sensitivity to be changed without retraining the model.

This is useful when the relative cost of false positives and false negatives changes.

Engineering Challenges

The project involved several challenges beyond simply implementing the individual components.

Keeping Data Consistent

Alert information passes through multiple layers:

Stream Processor
|
v
PostgreSQL
|
v
FastAPI
|
v
React

Fields such as:

merchant
location
device_id
severity
features
shap

must remain consistent across the entire path.

Adding Severity

Severity was introduced as an additional interpretation layer over the model probability.

The stream processor calculates the severity before storing the alert.

This allows the API and frontend to receive a ready-to-use alert object.

Threshold Persistence

The threshold cannot exist only inside React state.

If the browser changes the threshold, the stream processor must also receive the new value.

The system therefore uses:

React
|
v
FastAPI
|
v
threshold.json
|
v
Stream Processor

This keeps the frontend and processing service aligned.

Connecting SHAP to Alerts

SHAP values must correspond to the specific transaction that generated the prediction.

The explanation is therefore stored with the alert rather than being generated independently by the frontend.

This makes the investigation result reproducible for that alert.

Live Updates

The dashboard uses SSE to react to changes in transaction and alert data.

This allows the application to behave like a monitoring dashboard instead of a static reporting page.

Docker and Windows Development

Running Kafka, PostgreSQL, Python services, and the React application together introduces additional infrastructure considerations.

Particular areas that required attention include:

Docker service startup
Kafka connectivity
PostgreSQL availability
container rebuilds
bind mounts
frontend development behavior
Docker Desktop and WSL interaction
service logs and health checks

Keeping the services containerized makes the overall project much easier to reproduce.

Limitations

FraudShield is a portfolio and engineering project rather than a production banking system.

Several areas would require additional work before deployment in a real financial environment.

Security

The current configuration uses development credentials.

A production deployment should use:

secret management
encrypted database connections
authentication
authorization
credential rotation
secure environment configuration
Kafka

The current Kafka setup is designed for local development.

A production deployment would require:

multiple brokers
replication
partitioning strategy
retention policies
monitoring
fault tolerance
PostgreSQL

The local database configuration is intended for development.

Production would require:

backups
high availability
migrations
connection pooling
access control
monitoring
Machine Learning

The current project demonstrates model inference and monitoring but does not implement a complete production ML lifecycle.

Potential additions include:

model registry
experiment tracking
automated retraining
model validation
model versioning
rollback support
Drift Monitoring

The current drift monitoring is intentionally lightweight.

A production implementation could include:

feature-level drift
population stability index
prediction distribution monitoring
concept drift
label drift
feature availability monitoring
Authentication

The dashboard currently focuses on functionality rather than user management.

A production version could implement roles such as:

Analyst
Supervisor
Administrator

with different permissions.

Future Improvements

FraudShield provides a foundation that can be extended in several directions.

Analyst Case Management

Add the ability to:

acknowledge alerts
assign alerts
add investigation notes
mark confirmed fraud
mark false positives
close investigations
Historical Analytics

Add historical dashboards for:

fraud trends
merchant risk
customer risk
device risk
geographic patterns
hourly fraud activity
Advanced Drift Monitoring

Add historical drift charts and feature-level comparisons.

Automated Retraining

A future version could automatically trigger model retraining when:

drift exceeds a threshold
model performance decreases
enough new labeled data becomes available
Model Versioning

Associate each alert with:

model name
model version
training date
threshold

This would make historical investigations more reproducible.

Authentication

Add authentication and role-based access control.

Cloud Deployment

The architecture could eventually be adapted to cloud infrastructure using:

managed Kafka
managed PostgreSQL
container orchestration
object storage
centralized logging
cloud monitoring
Technology Stack
Category	Technology
Frontend	React
Build Tool	Vite
Styling	Tailwind CSS
Charts	Recharts
HTTP Client	Axios
Backend	FastAPI
Application Server	Uvicorn
Event Streaming	Apache Kafka
Kafka Client	kafka-python
Database	PostgreSQL
Database Access	SQLAlchemy
Data Processing	Pandas / NumPy
Machine Learning	Scikit-learn
Explainability	SHAP
Containers	Docker
Orchestration	Docker Compose
Database Interface	Adminer
Project Status

FraudShield currently includes:

 Real-time transaction generation
 Kafka event streaming
 Continuous stream processing
 Machine learning fraud scoring
 Fraud probability calculation
 Configurable fraud threshold
 Live threshold control
 Alert generation
 Alert severity classification
 PostgreSQL alert persistence
 SHAP model explanations
 Model metadata
 Runtime drift monitoring
 FastAPI REST API
 Server-Sent Events
 React monitoring dashboard
 Transaction risk visualization
 Fraud vs normal visualization
 Model performance dashboard
 Drift monitoring dashboard
 Recent alert queue
 Alert severity display
 Alert investigation panel
 SHAP driver visualization
 Docker Compose environment
 PostgreSQL inspection through Adminer
 Development configuration through .env.example
 Repository cleanup and GitHub-ready structure
License

This project is available under the MIT License.

See LICENSE for details.

Author
Manas Mehrotra

FraudShield was developed as an end-to-end exploration of:

real-time machine learning
fraud detection
event-driven systems
Kafka-based streaming
model explainability
model monitoring
backend development
frontend development
data visualization
PostgreSQL
Docker-based application architecture

The project focuses on connecting these technologies into one working system rather than treating each component as an isolated demonstration.

Final Architecture

The complete FraudShield workflow can be summarized as:

                     +----------------+
                     |  Transactions  |
                     +-------+--------+
                             |
                             v
                     +----------------+
                     |    Producer    |
                     +-------+--------+
                             |
                             v
                     +----------------+
                     |     Kafka      |
                     | transactions   |
                     +-------+--------+
                             |
                             v
                +-------------------------+
                |    Stream Processor     |
                |                         |
                | Feature Preparation    |
                | ML Prediction           |
                | Probability             |
                | Threshold               |
                | Severity                |
                | SHAP                    |
                | Drift Monitoring        |
                +-----------+-------------+
                            |
                 +----------+----------+
                 |                     |
                 v                     v
         +---------------+     +---------------+
         |  PostgreSQL   |     | Runtime Data  |
         | Alerts        |     | Metrics/State |
         +-------+-------+     +---------------+
                 |
                 v
         +---------------+
         |    FastAPI    |
         | REST + SSE    |
         +-------+-------+
                 |
                 v
         +---------------+
         | React Dashboard|
         +-------+-------+
                 |
                 v
         +---------------+
         | Investigation |
         +---------------+

The important part of FraudShield is not any single component.

It is the complete chain:

Transaction
↓
Kafka
↓
Real-Time Processing
↓
Machine Learning
↓
Risk Score
↓
Threshold + Severity
↓
SHAP Explanation
↓
PostgreSQL
↓
FastAPI
↓
SSE
↓
React Dashboard
↓
Human Investigation

That complete path is the purpose of FraudShield.