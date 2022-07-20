import express from "express";
import { Request, Response } from "express";
import { google } from 'googleapis';
import Profile from "../database/models/Profile";
import User from "../database/models/User";
import bcrypt from 'bcrypt';
import Verification from "../database/models/Verification";
import CustomError from "../CustomError";
import jwt from 'jsonwebtoken';
import AvalancheApi from "../avalanche/avalanche-api";
import Wallet from "../database/models/Wallet";


export default class GoogleRouter {
    router = express.Router();
    oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT,
        process.env.GOOGLE_SECRET,
        process.env.GOOGLE_REDIRECT,
    );

    scopes = [
        'https://www.googleapis.com/auth/user.phonenumbers.read',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/user.gender.read',
        'https://www.googleapis.com/auth/user.birthday.read'
    ]

    constructor() {
        this.initRoutes();
    }

    initRoutes = () => {
        this.router.post('/google/sign-up', this.signup);
    }

    signup = async (req: Request, res: Response) => {
        try {
            const { ppAccept, credential, newsLetter } = req.body;

            if (!credential) {
                throw new CustomError({
                    status: 400,
                    message: "You must provide credential"
                });
            }

            const avalanche = new AvalancheApi();
            
            let ticket = await this.oauth2Client.verifyIdToken({
                idToken: credential
            });
            
            let user = await User.findOne({
                where: {
                    email: ticket.getPayload().email,
                    isGoogle: true
                }
            });

            if (!user) {

                let exist = await User.findOne({
                    where:{
                        email: ticket.getPayload().email
                    }
                });
    
                if (exist) {
                    throw new CustomError({
                        status: 500,
                        message: `User ${ticket.getPayload().email} already registered.\nPlease Log In with e-mail and password.`
                    });
                }

                if(!ppAccept) {
                    throw new CustomError({
                        status: 400,
                        message: 'You must accept our privacy policy to sign up'
                    });
                }

                const profile: Profile = await Profile.create({
                    location: 'World, World'
                });
                const passwordHash = await bcrypt.hash(ticket.getPayload().sub, Number(process.env.SALT_ROUNDS) || 10);
                const verifyRecord = await Verification.create({
                    token: ticket.getUserId(),
                    verified: true,
                    verifiedAt: new Date()
                });

                user = await User.create({
                    fullName: ticket.getPayload().name,
                    email: ticket.getPayload().email,
                    password: passwordHash,
                    newsLetter: newsLetter,
                    registeredFrom: 'flashback',
                    profileId: profile.id,
                    verificationId: verifyRecord.id,
                    isGoogle: true
                });

                if (!user) {
                    throw new CustomError({
                        status: 500,
                        message: 'Internal server error: could not connect to database.'
                    });
                }

                const username: string = avalanche.encodedString(
                    await bcrypt.hash(
                        ticket.getPayload().email,
                        Number(process.env.SALT_ROUNDS)
                    )
                );

                await avalanche.createUser(
                    username,
                    passwordHash
                );
                const {xChain, cChain} = await avalanche.createAddress(
                    username,
                    passwordHash
                );
                const wallet = await Wallet.create({
                    walletAddress: xChain,
                    cChainAddress: cChain,
                    username: username
                });
    
                await user.update({
                    walletId: wallet.id
                });

            }

            const token = jwt.sign({
                data: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }
            }, process.env.TOKEN_SECRET, {
                expiresIn: '86400000'
            });

            await user.reload({
                attributes: {
                    exclude: ['password']
                }
            });

            res.status(200).json({
                status: 200,
                message: "ok",
                token,
                user
            })

        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(error.message || "Something went wrong")
        }
    }

}
