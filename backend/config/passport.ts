import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';

let configured = false;

export const configurePassport = () => {
  if (configured) {
    return passport;
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return passport;

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.SERVER_URL}/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        return done(null, profile as any);
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  configured = true;
  return passport;
};

export default configurePassport;
