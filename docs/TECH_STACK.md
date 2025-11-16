# 🛠️ Tech Stack - LaporIn

Dokumentasi lengkap teknologi yang digunakan dalam project LaporIn.

---

## 📱 Frontend Stack

### Core Framework
- **Next.js 16.0.3** (App Router)
  - React Server Components
  - File-based routing
  - API Routes
  - Image optimization
  - Font optimization

- **React 19.2.0**
  - Latest React features
  - Concurrent rendering
  - Server Components support

- **TypeScript 5.x**
  - Type safety
  - Better IDE support
  - Compile-time error checking

### Styling & UI
- **Tailwind CSS 4.x**
  - Utility-first CSS framework
  - Responsive design
  - Custom theme configuration
  - Dark mode ready

- **Material-UI (MUI) 7.x**
  - `@mui/material` - Core components
  - `@mui/icons-material` - Icon library
  - Tables, Dialogs, Forms
  - Consistent design system

- **Lucide React 0.553.0**
  - Modern icon library
  - React 19 compatible
  - Tree-shakeable icons

### State Management
- **Zustand 4.4.7**
  - Lightweight state management
  - Simple API
  - No boilerplate
  - Persist middleware (localStorage)

### Data Fetching
- **Axios 1.6.2**
  - HTTP client
  - Request/response interceptors
  - Error handling
  - Automatic JSON parsing

### Charts & Visualization
- **Chart.js 4.5.1**
  - Powerful charting library
  - Multiple chart types (Line, Bar, Doughnut)
  - Responsive & customizable

- **react-chartjs-2 5.3.1**
  - React wrapper for Chart.js
  - Easy integration
  - TypeScript support

### Forms
- **react-hook-form 7.49.2**
  - Performant form library
  - Validation
  - Less re-renders

### Fonts
- **Google Fonts**
  - Inter (body text)
  - Poppins (headings)
  - Optimized loading via Next.js

---

## 🔧 Backend Stack

### Runtime & Framework
- **Node.js 18+**
  - JavaScript runtime
  - Async/await support
  - ES Modules support

- **Express.js 4.18.2**
  - Web framework
  - Middleware support
  - RESTful API
  - CORS enabled

### Database
- **PostgreSQL 12+**
  - Relational database
  - ACID compliance
  - JSON/JSONB support
  - Full-text search

- **pg 8.11.3** (node-postgres)
  - PostgreSQL client for Node.js
  - Connection pooling
  - Query builder

### Authentication & Security
- **jsonwebtoken 9.0.2**
  - JWT token generation
  - Token verification
  - 7-day expiration

- **bcryptjs 2.4.3**
  - Password hashing
  - Salt rounds: 10
  - Secure password storage

- **crypto-js 4.2.0**
  - AES encryption
  - Data encryption sebelum blockchain logging
  - Decryption untuk verification

### AI Services
- **groq-sdk 0.35.0**
  - Groq AI API client
  - Model: llama-3.1-8b-instant
  - Fast inference
  - FREE tier

- **openai 4.20.1**
  - OpenAI API client
  - Model: gpt-3.5-turbo
  - Report processing (categorization, urgency)
  - Fallback jika Groq tidak tersedia

- **@google/generative-ai 0.24.1**
  - Google Gemini API client
  - Alternative AI provider
  - Multiple model support

### Blockchain
- **ethers 6.9.0**
  - Ethereum library
  - Smart contract interaction
  - Wallet management
  - Transaction signing

### Utilities
- **dotenv 16.3.1**
  - Environment variable management
  - .env file support

- **cors 2.8.5**
  - Cross-Origin Resource Sharing
  - API access control

- **axios 1.13.2**
  - HTTP client untuk external APIs
  - AI service calls

### Development Tools
- **nodemon 3.0.2**
  - Auto-restart on file changes
  - Development convenience

- **jest 29.7.0**
  - Testing framework
  - Unit tests
  - Integration tests

- **supertest 6.3.3**
  - HTTP assertion library
  - API endpoint testing

---

## ⛓️ Blockchain Stack

### Smart Contract
- **Solidity 0.8.19**
  - Smart contract language
  - Latest stable version
  - Security features

### Development Framework
- **Hardhat**
  - Ethereum development environment
  - Compilation
  - Testing
  - Deployment scripts

### Network
- **Polygon Mumbai Testnet**
  - Test network
  - Free test tokens
  - Fast transactions
  - Low gas fees

### Contract Features
- **WargaLapor.sol**
  - `logReportEvent()` - Log laporan ke blockchain
  - `logBantuanEvent()` - Log bantuan ke blockchain
  - `getReportEvents()` - Query events by report ID
  - Event emissions untuk indexing

---

## 🗄️ Database Schema

### Tables
1. **users**
   - User accounts
   - Role-based access
   - Gender statistics

2. **reports**
   - Laporan warga
   - Status tracking
   - Blockchain hash

3. **ai_processing_log**
   - AI processing history
   - Categorization results
   - Processing time

4. **report_status_history**
   - Status change history
   - Blockchain transaction hash
   - Updated by tracking

5. **chatbot_conversations**
   - Chat history
   - Intent detection
   - AI model used
   - Response time

6. **chatbot_training_data**
   - Training dataset
   - Labeled intents
   - Feedback system

---

## 🔐 Security Features

### Authentication
- JWT-based authentication
- Password hashing (bcrypt)
- Role-based access control (RBAC)
- Protected API routes

### Data Protection
- AES encryption untuk sensitive data
- PII redaction di NLP processing
- Secure environment variables
- CORS configuration

### Blockchain Security
- Immutable audit trail
- Transaction verification
- Meta hash untuk integrity check
- Public verification via Polygonscan

---

## 📊 Performance Optimizations

### Frontend
- Next.js Image optimization
- Code splitting
- Lazy loading
- Skeleton loaders
- Debounced search/filter

### Backend
- Connection pooling (PostgreSQL)
- Lazy initialization (blockchain)
- Graceful fallbacks (AI services)
- Efficient database queries
- Pagination support

### Database
- Indexed columns
- Optimized queries
- Connection pooling
- Efficient JOINs

---

## 🧪 Testing Stack

- **Jest** - Test runner
- **Supertest** - API testing
- **Test scripts** - Automated testing

---

## 📦 Package Management

- **npm** - Node Package Manager
- **package-lock.json** - Lock file untuk version consistency

---

## 🌐 Deployment Ready

### Frontend
- Next.js production build
- Static optimization
- Server-side rendering
- API routes

### Backend
- Express.js production mode
- Environment-based configuration
- Error handling
- Logging

### Database
- PostgreSQL production setup
- Backup strategies
- Migration scripts

### Blockchain
- Mainnet deployment ready
- Contract verification
- Gas optimization

---

## 📈 Scalability Considerations

- **Horizontal scaling** - Stateless backend
- **Database indexing** - Optimized queries
- **Caching** - Redis ready (dependencies included)
- **CDN** - Static assets
- **Load balancing** - Multiple instances

---

## 🔄 Version Control

- **Git** - Version control
- **GitHub/GitLab** - Repository hosting

---

## 📚 Documentation Tools

- **Markdown** - Documentation format
- **API Documentation** - Comprehensive endpoint docs
- **Code Comments** - Inline documentation

---

**Tech Stack Summary:**
- ✅ Modern & Up-to-date
- ✅ Production-ready
- ✅ Scalable architecture
- ✅ Security-first
- ✅ Developer-friendly

