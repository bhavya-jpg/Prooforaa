🧾 Proofora - Blockchain-based Design Ownership Verification System

🚀 Description

Proofora is a web platform that ensures design authenticity and ownership using the Aptos Blockchain. It empowers designers, UI/UX developers, and creators to protect their digital work from plagiarism by verifying and storing it securely on-chain.

When a designer uploads their work (e.g., UI design, website layout, or components), our platform:

Scans the design pixel-by-pixel, capturing key data such as sRGB, DPI, and matrix patterns.

Sends this data hash to the Aptos blockchain, ensuring immutable proof of ownership with timestamps.

Generates a verified ownership badge for the user — certifying authenticity and protection.



💡Vision:  Why Proofora?

Design plagiarism is an ever-growing problem. With rapid AI generation and digital sharing, proof of originality often becomes ambiguous. Existing tools only check for visual similarity, but fail to validate ownership or timestamp authenticity.

Proofora bridges this gap by:

Using blockchain verification instead of centralized databases.

Providing tamper-proof timestamps for ownership tracking.

Allowing legal evidence submission via immutable design records.

Empowering designers to protect creativity and prove originality effortlessly.


⚙️ Core Features

🧠 1. Design Ownership Verification

Upload your design (PNG, JPG, WebP, etc.).

Our AI-powered scanner analyzes every pixel, color matrix, and texture pattern.

Metadata (pixel map, sRGB, DPI, hash) is securely sent to Aptos Blockchain.

You receive a Verified Ownership Certificate & on-chain record.


🔍 2. Design Comparison & Plagiarism Detection

Compare two uploaded designs — the original and a suspected copy.

Our Python-based comparison model calculates similarity percentage.

If similarity exceeds a threshold (e.g., >85%), plagiarism is flagged.

The original creator can then legally claim copyright using Proofora’s verified records.


📦 3. Future Integrations (Planned)

Upload Figma prototypes, GitHub codebases, or JSON metadata for full proof-of-work evidence.

Integrate a web scraper that automatically checks for similar designs online.

Expand blockchain storage to include multiple file types and metadata references.



📜 Smart Contract: ProoforaDesignRegistry

The ProoforaDesignRegistry smart contract is deployed on the Aptos Blockchain and serves as the backbone of Proofora’s ownership verification system. It securely records each design’s unique hash, along with the creator’s wallet address and timestamp, ensuring transparent and tamper-proof proof of ownership.

Contract Details:

Module: design_registry

Package Name: ProoforaDesignRegistry

Version: 1.0.0

Blockchain: Aptos (Testnet)

Upgrade Policy: Compatible

Source Digest: 10BF1952AA7A87A50ACDB712061A9C03264818AC3020C35D8DAE078322767428

Core Responsibilities:

Register unique design hashes linked to creator wallet addresses.

Store immutable timestamps for each registration.

Enable public verification of design authenticity via on-chain queries.

Maintain upgradability and security using Aptos Move’s modular architecture.

Integration with Proofora:

When a user uploads a design, its SHA-256 hash is generated.

This hash, along with metadata (timestamp and wallet ID), is sent to the design_registry module.

The frontend (React) and backend (Node.js) communicate through API calls that interact with Aptos using the Aptos SDK and CLI.

The blockchain record is then reflected in the user’s Proofora dashboard, displaying verified ownership and transaction details

<img width="1568" height="756" alt="image" src="https://github.com/user-attachments/assets/54b71612-fda3-4363-ace9-639ef0c07103" />



🧩 Tech Stack

Layer	Technology Used	Purpose

Frontend	React.js, Tailwind CSS, ShadCN, Aceternity, Magic-UI, React-Bits	Interactive UI, smooth UX
Animation	GreenSock (GSAP), Lenis.js	Smooth transitions, creative flow
Backend	Node.js, Express.js	API, user & file handling
Image Analysis	Python, FastAPI, OpenCV, NumPy, Scikit-image	Pixel, color, and pattern analysis
Blockchain	Aptos Blockchain, Move Language	Ownership verification, timestamp proof
Database	MongoDB (or Firebase)	Metadata and user data storage
Storage	IPFS (InterPlanetary File System)	Decentralized file storage
Deployment	Vercel / Netlify (Frontend), Render / Railway (Backend)	Hosting and CI/CD


🛠️ Installation Guide

Prerequisites

Make sure you have installed:

Node.js (v18+)

Python (v3.9+)

Git

Aptos CLI

MongoDB


Steps

# 1. Clone the repository
git clone https://github.com/yourusername/proofora.git

# 2. Move into project directory
cd Prooforaa/-Proofora-/art-scan-nexus

# 3. Install dependencies for frontend
npm install

# 4. Install dependencies for backend
cd backend
npm install

# 5. Set up Python virtual environment (for image comparison)
cd ../proofora-ml
python -m venv venv
source venv/bin/activate     # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 6. Start backend server
cd ../backend
npm run dev

# 7. Start frontend server
cd ../
npm run dev

Environment Variables (.env)

Create a .env file in both backend and frontend directories:

MONGO_URI=your_mongodb_uri
APTOS_PRIVATE_KEY=your_aptos_private_key
IPFS_API_KEY=your_ipfs_api_key
PORT=5000


📊 Workflow

Flow Summary:
User uploads design → AI scans → Hash generated → Sent to Aptos Blockchain → Ownership Badge issued.

Comparison module (Python) → Detects plagiarism → Legal proof generated for the rightful owner.

Future modules → Upload proof-of-work → Auto web scan → Cross-platform integration.

🔐 Blockchain Logic (Aptos Integration)

Each uploaded design istffv hashed using SHA-256.

The hash is sent to the Aptos blockchain smart contract.

A timestamp and owner wallet address are recorded.

Anyone can verify ownership by querying the blockchain.


🌐 UI / UX Vision

Proofora’s interface is designed to feel modern, cinematic, and professional, featuring:

Gradient backgrounds and soft textures inspired by design portfolios.
 
Smooth animations using GSAP and Lenis.js.

Components from ShadCN, Aceternity, and Magic-UI.

Dark + glassmorphism theme for creative professionals.



🧭 Future Roadmap

Integration with Figma, GitHub, and Dribbble APIs

Automated plagiarism scan via AI-based web crawler

Advanced similarity algorithms using deep learning

NFT minting of verified designs for ownership trading


🧠 Vision

Proofora envisions a world where every designer, no matter how small or independent, can prove originality, claim ownership, and safeguard creativity — permanently and transparently through blockchain.
