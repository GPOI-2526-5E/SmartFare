# SmartFare Deployment Guide

## Quick Start Deployment

### Prerequisites
- GitHub account with repository access
- Vercel account (for frontend)
- Render account (for backend)
- PostgreSQL database instance (cloud-hosted or local)
- Gemini API key
- OAuth provider credentials (GitHub, Google)

---

## Backend Deployment (Render)

### Step 1: Prepare Backend

```bash
cd Smartfare-Backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Verify it builds
npm run build 2>&1 | head -20
```

### Step 2: Configure Environment Variables

Create `.env` file with production values:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/smartfare_prod
DATABASE_DIRECT_URL=postgresql://user:password@host:5432/smartfare_prod

# Server
PORT=3001
NODE_ENV=production
BACKEND_URL=https://YOUR_RENDER_SERVICE.onrender.com

# Frontend URLs
FRONTEND_URL=https://smartfare.vercel.app,https://smartfare.com

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Gemini AI
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.5-flash

# OAuth
GITHUB_CLIENT_ID=<your-github-app-id>
GITHUB_CLIENT_SECRET=<your-github-app-secret>
ID_CLIENT=<your-google-client-id>

# Email
SENDGRID_API_KEY=<sendgrid-key>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASS=<app-password>
EMAIL_FROM=noreply@smartfare.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>

# Vercel Preview
ALLOW_VERCEL_PREVIEW_ORIGINS=true
```

### Step 3: Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect GitHub repository
4. Configure:

| Field | Value |
|-------|-------|
| **Name** | smartfare-backend |
| **Root Directory** | Smartfare-Backend |
| **Build Command** | `npm ci; npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Standard (Free tier available) |

5. Add Environment Variables (copy from `.env`)
6. Click "Create Web Service"

### Step 4: Create PostgreSQL Database

1. In Render Dashboard, click "New" → "PostgreSQL"
2. Configure:
   - **Name**: smartfare-db
   - **PostgreSQL Version**: 14
   - **Region**: Same as backend
   - **Datadog API Key**: (optional for monitoring)

3. Once created:
   - Copy `Internal Database URL`
   - Add to backend environment: `DATABASE_URL=...`

### Step 5: Initialize Database

SSH into backend and run migrations:

```bash
# Get SSH access from Render Dashboard
ssh render-instance-id

# Run migrations
npx prisma migrate deploy

# Seed database (if needed)
npx prisma db seed
```

### Step 6: Monitor Backend

```bash
# View logs in Render Dashboard
# Settings → Logs

# Health check endpoint
curl https://your-backend.onrender.com/health

# Should return:
# {"status":"ok"}
```

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

```bash
cd Smartfare-Frontend

# Install dependencies
npm install

# Build for production
npm run build

# Should create dist/SmartFare/browser/
ls dist/SmartFare/browser/
```

### Step 2: Configure Environment

Create `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend.onrender.com'
};
```

### Step 3: Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Configure when prompted:
# - Project name: smartfare
# - Framework: Angular
# - Output directory: dist/SmartFare/browser
# - Override build command? No
```

#### Option B: GitHub Integration

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import GitHub repository
4. Configure:

| Field | Value |
|-------|-------|
| **Framework** | Angular |
| **Root Directory** | Smartfare-Frontend |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist/SmartFare/browser` |

5. Add Environment Variables:
   - `VITE_API_URL=https://your-backend.onrender.com`

6. Click "Deploy"

### Step 4: Configure Custom Domain

1. In Vercel Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

```bash
# Example DNS records
A     smartfare.com        76.76.19.20
CNAME www.smartfare.com    cname.vercel-dns.com
```

### Step 5: Monitor Frontend

```bash
# Check deployment status
https://vercel.com/dashboard/smartfare

# View logs
Settings → Function Logs

# Test endpoint
curl https://smartfare.vercel.app/
```

---

## Database Setup

### PostgreSQL Cloud Providers

#### **Render PostgreSQL** (Recommended for this project)
```
Included with service
Managed backups
Automatic updates
```

#### **Railway**
```bash
railway add postgres
railway run npx prisma migrate deploy
```

#### **Neon**
```
Serverless PostgreSQL
Pay per compute
Auto-scaling
```

### Backup & Recovery

#### **Manual Backup**

```bash
# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

#### **Automated Backups**

Configure in provider dashboard:
- Daily automatic backups
- 30-day retention
- Point-in-time recovery

---

## Environment Variable Management

### Production Variables Checklist

```bash
✅ DATABASE_URL (PostgreSQL connection string)
✅ JWT_SECRET (min 32 chars, random)
✅ GEMINI_API_KEY (from Google Cloud)
✅ GITHUB_CLIENT_ID/SECRET (from GitHub Settings)
✅ SENDGRID_API_KEY (for emails)
✅ CLOUDINARY_* (for image hosting)
✅ FRONTEND_URL (whitelisted origins)
✅ BACKEND_URL (for OAuth callbacks)
```

### Secrets Rotation

```bash
# Generate new JWT_SECRET
openssl rand -base64 32

# Update in Render Dashboard
# Settings → Environment Variables

# Redeploy backend (restart required)
```

---

## Monitoring & Debugging

### Health Checks

```bash
# Backend health
curl -s https://backend.onrender.com/health | jq .

# Frontend status
curl -sI https://smartfare.vercel.app | grep -i status

# Database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Logs Inspection

#### **Render Backend Logs**
```bash
# Render Dashboard → Logs tab
# Real-time log streaming
# Search by timestamp, level, component
```

#### **Vercel Frontend Logs**
```bash
# Vercel Dashboard → Deployments → Logs
# Function logs
# Network logs
# Build logs
```

#### **PostgreSQL Logs**
```bash
# Check slow queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Error Tracking

**Frontend**:
- Logger Service captures errors
- Export logs from developer tools
- Check browser console in production

**Backend**:
- All errors logged to stdout
- Check Render logs for error patterns
- Implement Sentry for production (optional)

---

## CI/CD Pipeline

### Automated Deployment

**On Push to `main` Branch**:

1. **GitHub Actions** (if configured):
   - Run tests
   - Build artifacts
   - Deploy to Render (backend)
   - Deploy to Vercel (frontend)

2. **Render/Vercel Hooks**:
   - Automatically triggers deployment
   - No manual intervention needed

### Manual Deployment

```bash
# Backend
cd Smartfare-Backend
git add .
git commit -m "fix: something"
git push origin main
# Render auto-deploys

# Frontend
cd Smartfare-Frontend
git add .
git commit -m "feat: something"
git push origin main
# Vercel auto-deploys
```

---

## Performance Tuning

### Frontend Optimization

```typescript
// angular.json
{
  "configurations": {
    "production": {
      "optimization": true,
      "sourceMap": false,
      "buildOptimizer": true,
      "budgets": [
        {
          "type": "bundle",
          "name": "main",
          "baseline": "500kb",
          "maximumWarning": "550kb",
          "maximumError": "600kb"
        }
      ]
    }
  }
}
```

### Backend Optimization

```typescript
// Database connection pooling
// .env or Render Dashboard
DATABASE_POOL_SIZE=10
DATABASE_POOL_TIMEOUT=30000
DATABASE_IDLE_TIMEOUT=30000
```

### API Response Compression

Enabled automatically by Express/Vercel

---

## Rollback Procedure

### Frontend Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

### Backend Rollback (Render)

1. Go to Render Dashboard → Deploys
2. Find previous successful deploy
3. Click "Rollback"
4. Confirm

### Database Rollback

```bash
# If migration failed
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
psql $DATABASE_URL < backup.sql
```

---

## Maintenance

### Weekly Tasks

```bash
# Check logs for errors
# Monitor API response times
# Verify health checks pass
```

### Monthly Tasks

```bash
# Review & rotate secrets
# Update dependencies
# Test backup restoration
# Review performance metrics
```

### Quarterly Tasks

```bash
# Security audit
# Load testing
# Database optimization
# Infrastructure scaling review
```

---

## Troubleshooting Deployments

### Build Fails

**Error: `ENOENT: no such file or directory`**
```bash
# Solution: Install dependencies
npm ci  # Use ci instead of install for reproducible builds
```

**Error: `TypeScript compilation failed`**
```bash
# Solution: Check TypeScript config
npx tsc --noEmit
```

### Runtime Errors

**Error: `DATABASE_URL not configured`**
```bash
# Solution: Set in Render Dashboard environment variables
# Settings → Environment → Add DATABASE_URL
```

**Error: `GEMINI_API_KEY mancante`**
```bash
# Solution: Configure in Render Dashboard
# Verify key is valid: curl -H "Authorization: Bearer $KEY" https://...
```

### Performance Issues

**Slow API responses**:
```bash
# Check database queries
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT ..."

# Check Render instance type
# Scale up if needed: Settings → Instance Type → Upgrade
```

**Slow frontend loads**:
```bash
# Check bundle size
npm run build && npm run analyze

# Optimize images
# Enable gzip compression (automatic)
```

---

## Scaling for Production

### Step 1: Upgrade Instances

**Render Backend**:
- Free → Standard: $7/month
- Standard → Pro: $20/month

**Vercel Frontend**:
- Already globally distributed
- Pro/Enterprise for advanced features

### Step 2: Add Caching

```bash
# Redis cache for API responses
# Render Dashboard → New → Redis
DATABASE_REDIS_URL=redis://...
```

### Step 3: Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_chat_session_user_id ON "ChatSession"(userId);
CREATE INDEX idx_itinerary_user_id ON "Itinerary"(userId);

-- Monitor query performance
EXPLAIN ANALYZE SELECT ...
```

### Step 4: Load Balancing

For very high traffic:
- Multiple backend instances behind load balancer
- Read replicas for database
- Content delivery network for static assets

---

## Support & Next Steps

1. **Monitor logs** regularly
2. **Set up alerts** for errors
3. **Plan scaling** before hitting limits
4. **Document procedures** for team
5. **Backup regularly** and test restores

For issues:
- Check Render/Vercel documentation
- Review application logs
- Test locally to reproduce
- Ask in forums/communities

---

**Last Updated**: May 14, 2026  
**Version**: 1.0  
**Status**: Production Ready
