# Collab Editor Deployment Guide

This guide explains how to deploy the Collab Editor application with:
- Frontend on Vercel
- Backend on Railway

## Frontend Deployment (Vercel)

1. **Push your code to GitHub**

2. **Configure environment variable**:
   - Create a `.env` file in your Frontend directory with:
   ```
   REACT_APP_API_URL=https://collabeditor-production-51a9.up.railway.app
   ```

3. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign up/login
   - Import your GitHub repository
   - Configure the project:
     - Root Directory: `Frontend`
     - Framework Preset: `Create React App`
     - Build Command: `npm run build`
     - Output Directory: `build`
   - Add environment variable:
     - `REACT_APP_API_URL`: `https://collabeditor-production-51a9.up.railway.app`
   - Click "Deploy"

## Backend Deployment (Railway)

1. **Configure MongoDB**:
   - Ensure you have a MongoDB database (Atlas or other)
   - Get your MongoDB connection string

2. **Connect to Railway**:
   - Go to [railway.app](https://railway.app) and sign up/login
   - Create new project and import your GitHub repository
   - Configure the project:
     - Root Directory: `./Backend`
     - Environment variables:
       - `mongoURL`: Your MongoDB connection string
       - `JWT_SECRET`: Your JWT secret key
       - `FRONTEND_URL`: Your Vercel frontend URL
       - Other required environment variables
   - Deploy the project
   - Add public domain (use port 3050)

## Testing

After deployment:
1. Test user authentication (login/signup)
2. Test WebSocket connections for real-time collaboration
3. Verify all API calls are working correctly

## Troubleshooting

- **CORS Issues**: Ensure `FRONTEND_URL` is set correctly in Railway
- **Authentication Problems**: Check JWT_SECRET matches between environments
- **Database Connection**: Verify MongoDB connection string is correct
- **Socket Connection**: Make sure WebSocket connections are properly configured

## Updating Deployed Application

- **Frontend**: Push changes to GitHub, Vercel will auto-deploy
- **Backend**: Push changes to GitHub, Railway will auto-deploy 