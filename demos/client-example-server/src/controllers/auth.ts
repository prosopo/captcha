import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';

import {UserInterface} from '../models/user';
import {Connection} from "mongoose";
import {isVerified} from "../utils/ProsopoCaptchaApi";

const signup = async (mongoose: Connection, req, res, next) => {
    try {
        const User = mongoose.model<UserInterface>('User');
        // checks if email exists
        const dbUser = await User.findOne(
            {
                email: req.body.email
            }
        )
        console.log(req.body);

        if (dbUser) {
            return res.status(409).json({message: "email already exists"});
        } else if (req.body.email && req.body.password && req.body.providerUrl && req.body.web3Account && req.body.commitmentId) {

            if (await isVerified(req.body.providerUrl, req.body.web3Account, req.body.commitmentId)) {

                // password hash
                bcrypt.hash(req.body.password, 12, (err, passwordHash) => {
                    if (err) {
                        return res.status(500).json({message: "couldnt hash the password"});
                    } else if (passwordHash) {
                        return User.create(({
                            email: req.body.email,
                            name: req.body.name,
                            password: passwordHash,
                        }))
                            .then(() => {
                                res.status(200).json({message: "user created"});
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(502).json({message: "error while creating the user"});
                            });
                    }
                });
            } else {
                res.status(401).json({message: "user has not completed a captcha"});
            }
        } else if (!req.body.password) {
            return res.status(400).json({message: "password not provided"});
        } else if (!req.body.email) {
            return res.status(400).json({message: "email not provided"});
        }

    } catch (err) {
        console.error('error', err);
        res.status(500).json({message: err.message || 'internal server error'});
    }

};

const login = async (mongoose: Connection, req, res) => {
    const User = mongoose.model<UserInterface>('User');
    // checks if email exists
    await User.findOne(
        {
            email: req.body.email
        }
    )
        .then(dbUser => {
            if (!dbUser) {
                return res.status(404).json({message: "user not found"});
            } else {
                // password hash
                bcrypt.compare(req.body.password, dbUser.password, (err, compareRes) => {
                    if (err) { // error while comparing
                        res.status(502).json({message: "error while checking user password"});
                    } else if (compareRes) { // password match
                        const token = jwt.sign({email: req.body.email}, 'secret', {expiresIn: '1h'});
                        res.status(200).json({message: "user logged in", "token": token});
                    } else { // password doesnt match
                        res.status(401).json({message: "invalid credentials"});
                    }
                });
            }
        })
        .catch(err => {
            console.error('error', err);
            res.status(500).json({message: err.message || 'internal server error'});
        });
}


const isAuth = (req, res) => {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
        return res.status(401).json({message: 'not authenticated'});
    }

    const token = authHeader.split(' ')[1];
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, 'secret');
    } catch (err) {
        return res.status(500).json({message: err.message || 'could not decode the token'});
    }

    if (!decodedToken) {
        res.status(401).json({message: 'unauthorized'});
    } else {
        res.status(200).json({message: 'here is your resource'});
    }

};

export {signup, login, isAuth};
