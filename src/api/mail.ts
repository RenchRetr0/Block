import  dotenv from 'dotenv';
import CustomError from '../CustomError';
import User from '../database/models/User';
import sequelize from '../database/sequelize';
import {Sequelize} from 'sequelize-typescript';
import Verification from '../database/models/Verification';
import Circle from '../database/models/Circle';
import { appAssert, tryGetUser } from './commom';
import EventModel from '../database/models/Events';
import {Op} from 'sequelize';
import NftBalance from '../database/models/NftBalance';
import { createQR } from './qrcode';
const crypto = require('crypto');
const mailchimp = require('@mailchimp/mailchimp_transactional')(
    process.env.MAILCHIMP_API
);
dotenv.config();

export default class Mail {
    email: string;
    sequelize: Sequelize;

    constructor() {
        this.email = process.env.MC_EMAIL;
        this.sequelize = sequelize;
    }

    public async signUpMail(options: {
        email: string,
        fullName: string
    }) {
        try {
            const {email, fullName} = options;

            if (!email || !fullName) {
                throw new CustomError({
                    status: 400,
                    message: 'Parameters are required.'
                });
            }

            const token = crypto.randomBytes(64).toString('hex');
            const updatedUser = await User.update({
                verificationId: (await Verification.create({
                    token: token
                })).id
            }, {
                where: {
                    email: {
                        [Op.iLike]: `%${email.toLowerCase()}%`
                    }
                }
            });

            if (!updatedUser) {
                throw new CustomError({
                    status: 500,
                    message: 'Internal server error: cannot connect to database.',
                });
            }

            const mail = await mailchimp.messages.send({
                message: {
                    subject: 'Confirm Your FlashBack Account to Continue Browsing',
                    html: `<!DOCTYPE html>
                    <html lang="en">
                      <head>
                        <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                        <link
                          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                          rel="stylesheet"
                        />
                      </head>
                      <body>
                        <table
                          width="100%"
                          style="
                            background-color: #ffffff;
                            font-family: 'Rubik', sans-serif;
                            font-size: 14px;
                            font-weight: 300;
                            line-height: 1.6;
                          "
                        >
                          <tr>
                            <td>
                              <table
                                style="
                                  max-width: 512px;
                                  margin: 0 auto;
                                  background-color: #141414;
                                  padding-bottom: 15px;
                                "
                              >
                                <thead>
                                  <tr>
                                    <th style="padding: 20px">
                                      <img
                                        src="https://flashback.one/email/head.png"
                                        width="100%"
                                      />
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                        <tbody>
                                          <tr>
                                            <td>Hi, ${fullName}.</td>
                                          </tr>
                                          <tr>
                                            <td>
                                              You're almost ready to start enjoying FlashBack.
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              Please kindly verify that this is your email address
                                              by clicking here:
                                            </td>
                                          </tr>
                                          <tr>
                                            <td style="text-align: center; padding: 10px 0">
                                              <a
                                                href="${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/signUp?token=${token}"
                                                target="_blank"
                                                style="
                                                  text-decoration: none;
                                                  color: #141414;
                                                  background-color: #f5175d;
                                                  font-weight: 700;
                                                  padding: 9px 13px;
                                                  border-radius: 14px;
                                                  font-size: 16px;
                                                "
                                              >
                                                VERIFY EMAIL ADDRESS
                                              </a>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td style="padding-top: 10px">Kindest regards,</td>
                                          </tr>
                                          <tr>
                                            <td style="color: #c2ffa8; font-weight: 500">
                                              <img
                                                src="https://flashback.one/email/logo.png"
                                                alt="Logo"
                                                width="30px"
                                                style="
                                                  background-color: #c2ffa8;
                                                  border-radius: 50%;
                                                  vertical-align: middle;
                                                "
                                              />
                                              <span>FlashBack</span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td>
                                      <table style="width: 100%; margin-top: 40px">
                                        <tbody style="text-align: center; font-size: 9px">
                                          <tr>
                                            <td>
                                              <a
                                                href="https://www.facebook.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/facebook.png"
                                                  alt="Facebook"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://instagram.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/instagram.png"
                                                  alt="Instagram"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://flashback.one"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/web.png"
                                                  alt="Web"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>FLASHBACK.ONE</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://www.linkedin.com/company/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/linkedin.png"
                                                  alt="LinkedIn"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://twitter.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/twitter.png"
                                                  alt="Twitter"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown, New Castle, 19709
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      This email was created automatically, please do not reply.
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </body>
                    </html>`,
                    from_name: 'Flashback Team',
                    from_email: this.email,
                    to: [
                        {
                            email: email.toLowerCase(),
                        }
                    ],
                    track_opens: true,
                    track_clicks: true
                }
            });

            if (!mail) {
                throw new CustomError({
                    status: 500,
                    message: 'Internal server error: mail service do not work.'
                });
            }

            return {
                status: 200,
                message: 'Verification link created'
            };
        } catch(e) {
            throw e;
        }
    }

    public async mintSignUp(email: string, password: string) {
        const mail = await mailchimp.messages.send({
            message: {
                subject: `Wellcome to FlashBack.one`,
                html: `<!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                    <link
                      href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                      rel="stylesheet"
                    />
                  </head>
                  <body>
                    <table
                      width="100%"
                      style="
                        background-color: #ffffff;
                        font-family: 'Rubik', sans-serif;
                        font-size: 14px;
                        font-weight: 300;
                        line-height: 1.6;
                      "
                    >
                      <tr>
                        <td>
                          <table
                            style="
                              max-width: 512px;
                              margin: 0 auto;
                              background-color: #141414;
                              padding-bottom: 15px;
                            "
                          >
                            <thead>
                              <tr>
                                <th style="padding: 20px">
                                  <img
                                    src="https://flashback.one/email/head.png"
                                    width="100%"
                                  />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                    <tbody>
                                      <tr>
                                        <td>Dear New User,</td>
                                      </tr>
                                      <tr>
                                        <td>
                                          Our team welcomes you at FlashBack, a bespoke ticketing platform, and wants to share a few words about us to maximise your experience.
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>
                                          FlashBack is a unique event platform that enables organisers to create and sell beautiful and functional tickets and event enthusiasts to collect these tickets and share collection with their friends. Powered by NFT (Non-Fungible Token) technology, FlashBack is able to offer unique and authentic art-like tickets with enhanced security.
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>
                                          Your login: ${email}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>
                                          Your password: ${password}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="padding-top: 10px">Kindest regards,</td>
                                      </tr>
                                      <tr>
                                        <td style="color: #c2ffa8; font-weight: 500">
                                          <img
                                            src="https://flashback.one/email/logo.png"
                                            alt="Logo"
                                            width="30px"
                                            style="
                                              background-color: #c2ffa8;
                                              border-radius: 50%;
                                              vertical-align: middle;
                                            "
                                          />
                                          <span>FlashBack</span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr>
                                <td>
                                  <table style="width: 100%; margin-top: 40px">
                                    <tbody style="text-align: center; font-size: 9px">
                                      <tr>
                                        <td>
                                          <a
                                            href="https://www.facebook.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/facebook.png"
                                              alt="Facebook"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://instagram.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/instagram.png"
                                              alt="Instagram"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://flashback.one"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/web.png"
                                              alt="Web"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>FLASHBACK.ONE</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://www.linkedin.com/company/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/linkedin.png"
                                              alt="LinkedIn"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://twitter.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/twitter.png"
                                              alt="Twitter"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align: center; font-size: 8px; color: #ffffff">
                                  FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown, New Castle, 19709
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align: center; font-size: 8px; color: #ffffff">
                                  This email was created automatically, please do not reply.
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>`,
                from_name: 'Flashback Team',
                from_email: this.email,
                to: [
                    {
                        email: email,
                    }
                ],
                track_opens: true,
                track_clicks: true
            }
        })
    }

    public async TransferToUnregisteredUserMail(options: {
        email: string,
        senderName: string,
        eventName: string,
        password: string,
        ticket: NftBalance
    }) {
        try {
            const {email, senderName, eventName, password, ticket} = options;

            if (!email || !senderName || !eventName) {
                throw new CustomError({
                    status: 400,
                    message: 'Parameters is required.'
                });
            }

            const token = crypto.randomBytes(64).toString('hex');
            const updatedUser = await User.update({
                verificationId: (await Verification.create({
                    token: token
                })).id
            }, {
                where: {
                    email: {
                        [Op.iLike]: `%${email.toLowerCase()}%`
                    }
                }
            });

            const isJson = (value: any) => {
              try {
                  JSON.parse(value);
              } catch (e) {
                  return false;
              }
              return true;
          };

          const timezone: string = isJson(ticket.tickets.event.timezone)
              ? JSON.parse(<string>ticket.tickets.event.timezone).gmtOffset
              : ticket.tickets.event.timezone;
          const localTime: any = new Date(
              Number(ticket.tickets.event.endTime) -
                  Number(timezone.replace(/^GMT((?:\+|\-)\d+):\d+$/g, "$1")) *
                      3600 *
                      1000
          );

          const qrcode = await createQR(ticket.txid);

          const mail = await mailchimp.messages.send({
              message: {
                  subject: `${senderName} Sent You a Ticket for ${eventName} at FlashBack`,
                  html: `<!DOCTYPE html>
                  <html lang="en">
                    <head>
                      <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                      <link rel="preconnect" href="https://fonts.googleapis.com" />
                      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                      <link
                        href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                        rel="stylesheet"
                      />
                    </head>
                    <body>
                      <table
                        width="100%"
                        style="
                          background-color: #ffffff;
                          font-family: 'Rubik', sans-serif;
                          font-size: 14px;
                          font-weight: 300;
                          line-height: 1.6;
                        "
                      >
                        <tr>
                          <td>
                            <table
                              style="
                                max-width: 512px;
                                margin: 0 auto;
                                background-color: #141414;
                                padding-bottom: 15px;
                              "
                            >
                              <thead>
                                <tr>
                                  <th style="padding: 20px">
                                    <img
                                      src="https://flashback.one/email/head.png"
                                      width="100%"
                                    />
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>
                                    <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                      <tbody>
                                        <tr>
                                          <td>
                                            ${senderName} has just sent you a ticket for
                                            ${eventName} at FlashBack. How exciting!
                                          </td>
                                        </tr>
                                        <tr>
                                          <td>
                                            Your FlashBs ${ticket.tickets.name} - ${localTime.getDate()}.${localTime.getMonth() + 1}.${localTime.getFullYear()} ${Math.round(localTime.getHours() / 2)}:${localTime.getMinutes() < 10 ? `0${localTime.getMinutes()}` : localTime.getMinutes()} ${(localTime.getHours() - 12) < 0 ? 'AM' : 'PM'} ${timezone} ${eventName}
                                          </td>
                                        </tr>
                                        <tr>
                                          <td>
                                            <table
                                              style="
                                                width: 100%;
                                                margin: 0 auto;
                                                color: #ffffff;
                                                border-spacing: 0;
                                                margin: 15px 0;
                                              "
                                            >
                                              <tr>
                                                <td style="text-align: start">
                                                  <a 
                                                    href="#"
                                                    target="_blank"
                                                    style="text-decoration: none"
                                                  >
                                                    <img
                                                      src="${ticket.tickets.event.banner ? `${process.env.API_PROTOCOL}://${process.env.API_DOMAIN}/${ticket.tickets.event.banner}` : `${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/logo/logo.png}`}"
                                                      width="185px"
                                                      alt="Event logo"
                                                      style="border-radius: 20px"
                                                    />
                                                  </a>
                                                </td>
                                                <td style="text-align: end">
                                                  <a 
                                                    href="#"
                                                    target="_blank"
                                                    style="text-decoration: none"
                                                  >
                                                    <img
                                                      src="cid:qr_code"
                                                      width="185px"
                                                      alt="Ticket QR"
                                                    />
                                                  </a>
                                                </td>
                                              </tr>
                                            </table>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td>
                                            Please kindly verify that this is your email address
                                            by clicking here:
                                          </td>
                                        </tr>
                                        <tr>
                                          <td style="text-align: center; padding: 10px 0 15px">
                                            <a
                                              href="${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/signUp?token=${token}"
                                              target="_blank"
                                              style="
                                                text-decoration: none;
                                                color: #141414;
                                                background-color: #f5175d;
                                                font-weight: 700;
                                                padding: 9px 13px;
                                                border-radius: 14px;
                                                font-size: 16px;
                                              "
                                            >
                                              VERIFY EMAIL ADDRESS
                                            </a>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td>Your temporary password: ${password}</td>
                                        </tr>
                                        <tr>
                                          <td style="padding-top: 20px">
                                            Our team welcomes you at FlashBack, a bespoke
                                            ticketing platform, and wants to share a few words
                                            about us to maximise your experience.
                                          </td>
                                        </tr>
                                        <tr>
                                          <td>
                                            <ul style="margin: 0; padding-left: 20px">
                                              <li>
                                                FlashBack is a unique event platform that enables
                                                organisers to create and sell beautiful and
                                                functional tickets and event enthusiasts to
                                                collect these tickets and share collection with
                                                their friends.
                                              </li>
                                              <li>
                                                Powered by NFT (Non-Fungible Token) technology,
                                                FlashBack is able to offer unique and authentic
                                                art-like tickets with enhanced security.
                                              </li>
                                            </ul>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td style="padding-top: 20px">Kindest regards,</td>
                                        </tr>
                                        <tr>
                                          <td style="color: #c2ffa8; font-weight: 500">
                                            <img
                                              src="https://flashback.one/email/logo.png"
                                              alt="Logo"
                                              width="30px"
                                              style="
                                                background-color: #c2ffa8;
                                                border-radius: 50%;
                                                vertical-align: middle;
                                              "
                                            />
                                            <span>FlashBack</span>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td>
                                    <table style="width: 100%; margin-top: 40px">
                                      <tbody style="text-align: center; font-size: 9px">
                                        <tr>
                                          <td>
                                            <a
                                              href="https://www.facebook.com/flashbacknft"
                                              target="_blank"
                                              style="text-decoration: none; color: #ffffff"
                                            >
                                              <img
                                                src="https://flashback.one/email/facebook.png"
                                                alt="Facebook"
                                                width="18px"
                                                style="vertical-align: middle"
                                              />
                                              <span>@flashbacknft</span>
                                            </a>
                                          </td>
                                          <td>
                                            <a
                                              href="https://instagram.com/flashbacknft"
                                              target="_blank"
                                              style="text-decoration: none; color: #ffffff"
                                            >
                                              <img
                                                src="https://flashback.one/email/instagram.png"
                                                alt="Instagram"
                                                width="18px"
                                                style="vertical-align: middle"
                                              />
                                              <span>@flashbacknft</span>
                                            </a>
                                          </td>
                                          <td>
                                            <a
                                              href="https://flashback.one"
                                              target="_blank"
                                              style="text-decoration: none; color: #ffffff"
                                            >
                                              <img
                                                src="https://flashback.one/email/web.png"
                                                alt="Web"
                                                width="18px"
                                                style="vertical-align: middle"
                                              />
                                              <span>FLASHBACK.ONE</span>
                                            </a>
                                          </td>
                                          <td>
                                            <a
                                              href="https://www.linkedin.com/company/flashbacknft"
                                              target="_blank"
                                              style="text-decoration: none; color: #ffffff"
                                            >
                                              <img
                                                src="https://flashback.one/email/linkedin.png"
                                                alt="LinkedIn"
                                                width="18px"
                                                style="vertical-align: middle"
                                              />
                                              <span>@flashbacknft</span>
                                            </a>
                                          </td>
                                          <td>
                                            <a
                                              href="https://twitter.com/flashbacknft"
                                              target="_blank"
                                              style="text-decoration: none; color: #ffffff"
                                            >
                                              <img
                                                src="https://flashback.one/email/twitter.png"
                                                alt="Twitter"
                                                width="18px"
                                                style="vertical-align: middle"
                                              />
                                              <span>@flashbacknft</span>
                                            </a>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="text-align: center; font-size: 8px; color: #ffffff">
                                    FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown,
                                    New Castle, 19709
                                  </td>
                                </tr>
                                <tr>
                                  <td style="text-align: center; font-size: 8px; color: #ffffff">
                                    This email was created automatically, please do not reply.
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </body>
                  </html>`,
                  from_name: 'Flashback Team',
                  from_email: this.email,
                  to: [
                      {
                          email: email.toLowerCase(),
                      }
                  ],
                  track_opens: true,
                  track_clicks: true
              }
            });

            if (!mail) {
                throw new CustomError({
                    status: 500,
                    message: 'Internal server error: mail service do not work.'
                });
            }

            return {
                status: 200,
                message: 'An email about sending tokens to an unregistered user was sent.'
            };
        } catch(e) {
            throw e;
        }
    }

    public async TransferToRegisteredUserMail(options: {
        email: string,
        senderName: string,
        eventName: string,
        receiverName: string,
        ticketLink: string,
        ticket: NftBalance
    }) {
        try {
            const {email, senderName, eventName, receiverName, ticketLink, ticket} = options;
            if (!email || !senderName || !eventName || !receiverName || !ticketLink) {
                throw new CustomError({
                    status: 400,
                    message: 'Parameters is required.'
                });
            }

            const isJson = (value: any) => {
              try {
                  JSON.parse(value);
              } catch (e) {
                  return false;
              }
              return true;
          };

          const timezone: string = isJson(ticket.tickets.event.timezone)
              ? JSON.parse(<string>ticket.tickets.event.timezone).gmtOffset
              : ticket.tickets.event.timezone;
          const localTime: any = new Date(
              Number(ticket.tickets.event.endTime) -
                  Number(timezone.replace(/^GMT((?:\+|\-)\d+):\d+$/g, "$1")) *
                      3600 *
                      1000
          );

          const qrcode = await createQR(ticket.txid);

          const mail = await mailchimp.messages.send({
              message: {
                  subject: `${senderName} Sent You a Ticket for ${eventName} at FlashBack`,
                  html: `<!DOCTYPE html>
                  <html lang="en">
                    <head>
                      <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                      <link rel="preconnect" href="https://fonts.googleapis.com" />
                      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                      <link
                        href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                        rel="stylesheet"
                      />
                    </head>
                    <body>
                      <table
                        width="100%"
                        style="
                          background-color: #ffffff;
                          font-family: 'Rubik', sans-serif;
                          font-size: 14px;
                          font-weight: 300;
                          line-height: 1.6;
                        "
                      >
                        <tr>
                          <td>
                            <table
                              style="
                                max-width: 512px;
                                margin: 0 auto;
                                background-color: #141414;
                                padding-bottom: 15px;
                              "
                            >
                              <thead>
                                <tr>
                                  <th style="padding: 20px">
                                    <img
                                      src="https://flashback.one/email/head.png"
                                      width="100%"
                                    />
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>
                                    <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                      <tbody>
                                        <tr>
                                          <td>
                                            ${senderName} has just sent you a ticket for
                                            ${eventName} at FlashBack. How exciting!
                                          </td>
                                        </tr>
                                        <tr>
                                          <td>
                                            Your FlashBs ${ticket.tickets.name} - ${localTime.getDate()}.${localTime.getMonth() + 1}.${localTime.getFullYear()} ${Math.round(localTime.getHours() / 2)}:${localTime.getMinutes() < 10 ? `0${localTime.getMinutes()}` : localTime.getMinutes()} ${(localTime.getHours() - 12) < 0 ? 'AM' : 'PM'} ${timezone} ${eventName}
                                          </td>
                                        </tr>
                                        <tr>
                                          <td>
                                            <table
                                              style="
                                                width: 100%;
                                                margin: 0 auto;
                                                color: #ffffff;
                                                border-spacing: 0;
                                                margin: 15px 0;
                                              "
                                            >
                                              <tr>
                                                <td
                                                  style="text-align: start"
                                                >
                                                  <a 
                                                    href="#"
                                                    target="_blank"
                                                    style="text-decoration: none"
                                                  >
                                                    <img
                                                      src="${ticket.tickets.event.banner ? `${process.env.API_PROTOCOL}://${process.env.API_DOMAIN}/${ticket.tickets.event.banner}` : `${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/logo/logo.png}`}"
                                                      width="185px"
                                                      alt="Event logo"
                                                      style="border-radius: 20px"
                                                    />
                                                  </a>
                                                </td>
                                                <td
                                                  style="text-align: end"
                                                >
                                                  <a 
                                                    href="#"
                                                    target="_blank"
                                                    style="text-decoration: none"
                                                  >
                                                    <img
                                                      src="cid:qr_code"
                                                      width="185px"
                                                      alt="Ticket QR"
                                                    />
                                                  </a>
                                                </td>
                                              </tr>
                                            </table>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td>
                                            Please click this link to claim the ticket:
                                          </td>
                                        </tr>
                                        <tr>
                                          <td style="text-align: center; padding: 15px 0">
                                            <a
                                              href="${ticketLink}"
                                              target="_blank"
                                              style="
                                                text-decoration: none;
                                                color: #141414;
                                                background-color: #f5175d;
                                                font-weight: 700;
                                                padding: 9px 13px;
                                                border-radius: 14px;
                                                font-size: 16px;
                                              "
                                            >
                                              CLAIM THE TICKET
                                            </a>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td>
                                            We wish you a great experience during ${eventName}!
                                          </td>
                                        </tr>
                                        <tr>
                                          <td style="padding-top: 20px">Kindest regards,</td>
                                        </tr>
                                        <tr>
                                          <td style="color: #c2ffa8; font-weight: 500">
                                            <img
                                              src="https://flashback.one/email/logo.png"
                                              alt="Logo"
                                              width="30px"
                                              style="
                                                background-color: #c2ffa8;
                                                border-radius: 50%;
                                                vertical-align: middle;
                                              "
                                            />
                                            <span>FlashBack</span>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td>
                                    <table style="width: 100%; margin-top: 40px">
                                      <tbody style="text-align: center; font-size: 9px">
                                        <tr>
                                          <td>
                                            <a
                                              href="https://www.facebook.com/flashbacknft"
                                              target="_blank"
                                              style="text-decoration: none; color: #ffffff"
                                            >
                                              <img
                                                src="https://flashback.one/email/facebook.png"
                                                alt="Facebook"
                                                width="18px"
                                                style="vertical-align: middle"
                                              />
                                              <span>@flashbacknft</span>
                                            </a>
                                          </td>
                                          <td>
                                            <a
                                              href="https://instagram.com/flashbacknft"
                                              target="_blank"
                                              style="text-decoration: none; color: #ffffff"
                                            >
                                              <img
                                                src="https://flashback.one/email/instagram.png"
                                                alt="Instagram"
                                                width="18px"
                                                style="vertical-align: middle"
                                              />
                                              <span>@flashbacknft</span>
                                            </a>
                                          </td>
                                          <td>
                                            <a
                                              href="https://flashback.one"
                                              target="_blank"
                                              style="text-decoration: none; color: #ffffff"
                                            >
                                              <img
                                                src="https://flashback.one/email/web.png"
                                                alt="Web"
                                                width="18px"
                                                style="vertical-align: middle"
                                              />
                                              <span>FLASHBACK.ONE</span>
                                            </a>
                                          </td>
                                          <td>
                                            <a
                                              href="https://www.linkedin.com/company/flashbacknft"
                                              target="_blank"
                                              style="text-decoration: none; color: #ffffff"
                                            >
                                              <img
                                                src="https://flashback.one/email/linkedin.png"
                                                alt="LinkedIn"
                                                width="18px"
                                                style="vertical-align: middle"
                                              />
                                              <span>@flashbacknft</span>
                                            </a>
                                          </td>
                                          <td>
                                            <a
                                              href="https://twitter.com/flashbacknft"
                                              target="_blank"
                                              style="text-decoration: none; color: #ffffff"
                                            >
                                              <img
                                                src="https://flashback.one/email/twitter.png"
                                                alt="Twitter"
                                                width="18px"
                                                style="vertical-align: middle"
                                              />
                                              <span>@flashbacknft</span>
                                            </a>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="text-align: center; font-size: 8px; color: #ffffff">
                                    FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown,
                                    New Castle, 19709
                                  </td>
                                </tr>
                                <tr>
                                  <td style="text-align: center; font-size: 8px; color: #ffffff">
                                    This email was created automatically, please do not reply.
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </body>
                  </html>`,
                  from_name: 'Flashback Team',
                  from_email: this.email,
                  images: [{
                    type: 'image/png',
                    name: 'qr_code',
                    content: qrcode
                  }],
                  to: [
                      {
                          email: email.toLowerCase(),
                      }
                  ],
                  track_opens: true,
                  track_clicks: true
              }
            });

            if (!mail) {
                throw new CustomError({
                    status: 500,
                    message: 'Internal server error: mail service do not work.'
                });
            }

            console.log(mail);

            return {
                status: 200,
                message: 'An email about sending tokens to an unregistered user was sent.'
            };
        } catch(e) {
            throw e;
        }
    }

    public async presignUpMail(options: {
        email: string,
        password: string
    }) {
        try {
            const {email, password} = options;

            if (!email || !password) {
                throw new CustomError({
                    status: 400,
                    message: 'Parameters is required.'
                });
            }

            const token = crypto.randomBytes(64).toString('hex');
            await User.update({
                verificationId: (await Verification.create({
                    token: token
                })).id
            }, {
                where: {
                    email: {
                        [Op.iLike]: `%${email.toLowerCase()}%`
                    }
                }
            });

            const mail = await mailchimp.messages.send({
                message: {
                    subject: 'Confirm Your FlashBack Account to Continue Browsing',
                    html: `<!DOCTYPE html>
                    <html lang="en">
                      <head>
                        <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                        <link
                          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                          rel="stylesheet"
                        />
                      </head>
                      <body>
                        <table
                          width="100%"
                          style="
                            background-color: #ffffff;
                            font-family: 'Rubik', sans-serif;
                            font-size: 14px;
                            font-weight: 300;
                            line-height: 1.6;
                          "
                        >
                          <tr>
                            <td>
                              <table
                                style="
                                  max-width: 512px;
                                  margin: 0 auto;
                                  background-color: #141414;
                                  padding-bottom: 15px;
                                "
                              >
                                <thead>
                                  <tr>
                                    <th style="padding: 20px">
                                      <img
                                        src="https://flashback.one/email/head.png"
                                        width="100%"
                                      />
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                        <tbody>
                                          <tr>
                                            <td>Hi, ${email.toLowerCase()}.</td>
                                          </tr>
                                          <tr>
                                            <td>
                                              You're almost ready to start enjoying FlashBack.
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              Please kindly verify that this is your email address
                                              by clicking here:
                                            </td>
                                          </tr>
                                          <tr>
                                            <td style="text-align: center; padding: 10px 0">
                                              <a
                                                href="#"
                                                target="_blank"
                                                style="
                                                  text-decoration: none;
                                                  color: #141414;
                                                  background-color: #f5175d;
                                                  font-weight: 700;
                                                  padding: 9px 13px;
                                                  border-radius: 14px;
                                                  font-size: 16px;
                                                "
                                              >
                                                VERIFY EMAIL ADDRESS
                                              </a>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              Your temporary password: ${password}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td style="padding-top: 10px">Kindest regards,</td>
                                          </tr>
                                          <tr>
                                            <td style="color: #c2ffa8; font-weight: 500">
                                              <img
                                                src="https://flashback.one/email/logo.png"
                                                alt="Logo"
                                                width="30px"
                                                style="
                                                  background-color: #c2ffa8;
                                                  border-radius: 50%;
                                                  vertical-align: middle;
                                                "
                                              />
                                              <span>FlashBack</span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td>
                                      <table style="width: 100%; margin-top: 40px">
                                        <tbody style="text-align: center; font-size: 9px">
                                          <tr>
                                            <td>
                                              <a
                                                href="https://www.facebook.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/facebook.png"
                                                  alt="Facebook"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://instagram.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/instagram.png"
                                                  alt="Instagram"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://flashback.one"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/web.png"
                                                  alt="Web"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>FLASHBACK.ONE</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://www.linkedin.com/company/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/linkedin.png"
                                                  alt="LinkedIn"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://twitter.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/twitter.png"
                                                  alt="Twitter"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown, New Castle, 19709
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      This email was created automatically, please do not reply.
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </body>
                    </html>`,
                    from_name: 'Flashback Team',
                    from_email: this.email,
                    to: [
                        {
                            email: email.toLowerCase(),
                        }
                    ],
                    track_opens: true,
                    track_clicks: true
                }
            });

            if (!mail) {
                throw new CustomError({
                    status: 500,
                    message: 'Internal server error: mail service do not work.'
                });
            }

            return {
                status: 200,
                message: 'An email about sending tokens to an unregistered user was sent.'
            };
        } catch(e) {
            throw e;
        }
    }

    public async sendCircleContributorMessageToUnregistredUser(options: {
        circle: Circle,
        credentials: {
            login: string,
            password: string
        },
        inviter: User
    }) {
        const { circle, credentials, inviter } = options;
        try {
            const token = crypto.randomBytes(64).toString('hex');
            await User.update({
                verificationId: (await Verification.create({
                    token: token,
                    verified: true
                })).id
            }, {
                where: {
                    email: credentials.login
                }
            });
            const mail = await mailchimp.messages.send({
                message: {
                    subject: `${inviter.fullName} Invited You as a Contributor to the "${circle.circleName}" at FlashBack.`,
                    html: `<!DOCTYPE html>
                    <html lang="en">
                      <head>
                        <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                        <link
                          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                          rel="stylesheet"
                        />
                      </head>
                      <body>
                        <table
                          width="100%"
                          style="
                            background-color: #ffffff;
                            font-family: 'Rubik', sans-serif;
                            font-size: 14px;
                            font-weight: 300;
                            line-height: 1.6;
                          "
                        >
                          <tr>
                            <td>
                              <table
                                style="
                                  max-width: 512px;
                                  margin: 0 auto;
                                  background-color: #141414;
                                  padding-bottom: 15px;
                                "
                              >
                                <thead>
                                  <tr>
                                    <th style="padding: 20px">
                                      <img
                                        src="https://flashback.one/email/head.png"
                                        width="100%"
                                      />
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                        <tbody>
                                          <tr>
                                            <td>
                                              Dear Name Surname,
                                              <br />
                                              You've been invited as a contributor to the circle ${circle.circleName}
                                              at FlashBack platform. Please click on
                                              this link to accept an invitation and use credentials below:
                                            </td>
                                          </tr>
                                          <tr>
                                            <td style="text-align: center; padding: 10px 0">
                                              <a
                                                href="${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/circles/admin/${circle.shortLink ? circle.shortLink : circle.id}"
                                                target="_blank"
                                                style="
                                                  text-decoration: none;
                                                  color: #141414;
                                                  background-color: #f5175d;
                                                  font-weight: 700;
                                                  padding: 9px 13px;
                                                  border-radius: 14px;
                                                  font-size: 16px;
                                                "
                                              >
                                                ACCEPT AN INVITATION
                                              </a>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              Your login: ${credentials.login}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              Your password: ${credentials.password}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              FlashBack is a bespoke ticketing platform that enables art-like and edgy tickets for any kind of events.
                                            </td>
                                          <tr>
                                          <tr>
                                            <td>We wish you a great event!</td>
                                          </tr>
                                          <tr>
                                            <td style="padding-top: 20px">Kindest regards,</td>
                                          </tr>
                                          <tr>
                                            <td style="color: #c2ffa8; font-weight: 500">
                                              <img
                                                src="https://flashback.one/email/logo.png"
                                                alt="Logo"
                                                width="30px"
                                                style="
                                                  background-color: #c2ffa8;
                                                  border-radius: 50%;
                                                  vertical-align: middle;
                                                "
                                              />
                                              <span>FlashBack</span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td>
                                      <table style="width: 100%; margin-top: 40px">
                                        <tbody style="text-align: center; font-size: 9px">
                                          <tr>
                                            <td>
                                              <a
                                                href="https://www.facebook.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/facebook.png"
                                                  alt="Facebook"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://instagram.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/instagram.png"
                                                  alt="Instagram"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://flashback.one"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/web.png"
                                                  alt="Web"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>FLASHBACK.ONE</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://www.linkedin.com/company/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/linkedin.png"
                                                  alt="LinkedIn"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://twitter.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/twitter.png"
                                                  alt="Twitter"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown, New Castle, 19709
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      This email was created automatically, please do not reply.
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </body>
                    </html>`,
                    from_name: 'Flashback Team',
                    from_email: this.email,
                    to: [
                        {
                            email: credentials.login,
                        }
                    ],
                    track_opens: true,
                    track_clicks: true
                }
            });

            if (!mail) {
                throw new CustomError({
                    status: 500,
                    message: 'Internal server error: mail service do not work.'
                });
            }

            return {
                status: 200,
                message: 'An email about adding as a circle contributor to an unregistered user was sent.'
            };
        } catch (error) {
            throw error
        }
    }

    public async sendCircleContributorMessageToRegistredUser(options: {
        circle: Circle,
        sender_userId: string | number,
        contributorId: string | number
    }) {
        const { circle, sender_userId, contributorId } = options;
        try {
            const sender = await tryGetUser(sender_userId);
            const newContributor = await tryGetUser(contributorId)
            const mail = await mailchimp.messages.send({
                message: {
                    subject: `${sender.fullName} Invited You as a Contributor to the "${circle.circleName}" at FlashBack.`,
                    html: `<!DOCTYPE html>
                    <html lang="en">
                      <head>
                        <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                        <link
                          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                          rel="stylesheet"
                        />
                      </head>
                      <body>
                        <table
                          width="100%"
                          style="
                            background-color: #ffffff;
                            font-family: 'Rubik', sans-serif;
                            font-size: 14px;
                            font-weight: 300;
                            line-height: 1.6;
                          "
                        >
                          <tr>
                            <td>
                              <table
                                style="
                                  max-width: 512px;
                                  margin: 0 auto;
                                  background-color: #141414;
                                  padding-bottom: 15px;
                                "
                              >
                                <thead>
                                  <tr>
                                    <th style="padding: 20px">
                                      <img
                                        src="https://flashback.one/email/head.png"
                                        width="100%"
                                      />
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                        <tbody>
                                          <tr>
                                            <td>
                                              Dear ${newContributor.fullName},
                                              <br />
                                              You've been invited as a contributor to the circle ${circle.circleName} 
                                              at FlashBack platform. Please click on
                                              this link to accept an invitation:
                                            </td>
                                          </tr>
                                          <tr>
                                            <td style="text-align: center; padding: 10px 0">
                                              <a
                                                href="${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/circles/admin/${circle.shortLink ? circle.shortLink : circle.id}"
                                                target="_blank"
                                                style="
                                                  text-decoration: none;
                                                  color: #141414;
                                                  background-color: #f5175d;
                                                  font-weight: 700;
                                                  padding: 9px 13px;
                                                  border-radius: 14px;
                                                  font-size: 16px;
                                                "
                                              >
                                                ACCEPT AN INVITATION
                                              </a>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              FlashBack is a bespoke ticketing platform that enables art-like and edgy tickets for any kind of events.
                                            </td>
                                          <tr>
                                          <tr>
                                            <td>We wish you a great event!</td>
                                          </tr>
                                          <tr>
                                            <td style="padding-top: 20px">Kindest regards,</td>
                                          </tr>
                                          <tr>
                                            <td style="color: #c2ffa8; font-weight: 500">
                                              <img
                                                src="https://flashback.one/email/logo.png"
                                                alt="Logo"
                                                width="30px"
                                                style="
                                                  background-color: #c2ffa8;
                                                  border-radius: 50%;
                                                  vertical-align: middle;
                                                "
                                              />
                                              <span>FlashBack</span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td>
                                      <table style="width: 100%; margin-top: 40px">
                                        <tbody style="text-align: center; font-size: 9px">
                                          <tr>
                                            <td>
                                              <a
                                                href="https://www.facebook.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/facebook.png"
                                                  alt="Facebook"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://instagram.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/instagram.png"
                                                  alt="Instagram"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://flashback.one"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/web.png"
                                                  alt="Web"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>FLASHBACK.ONE</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://www.linkedin.com/company/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/linkedin.png"
                                                  alt="LinkedIn"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://twitter.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/twitter.png"
                                                  alt="Twitter"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown, New Castle, 19709
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      This email was created automatically, please do not reply.
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </body>
                    </html>`,
                    from_name: 'Flashback Team',
                    from_email: this.email,
                    to: [
                        {
                            email: newContributor.email,
                        }
                    ],
                    track_opens: true,
                    track_clicks: true
                }
            });

            if (!mail) {
                throw new CustomError({
                    status: 500,
                    message: 'Internal server error: mail service do not work.'
                });
            }

            return {
                status: 200,
                message: 'An email about adding as a circle contributor to an registered user was sent.'
            };
        } catch (error) {
            throw error
        }
    }
    public async sendEventContributorMessageToUnregistredUser(options: {
        event: EventModel,
        inviter: User,
        credentials: {
            login: string,
            password: string
        },
        newUserId: string | number
    }) {
        const { event, credentials, inviter, newUserId } = options;
        try {
            const mail = await mailchimp.messages.send({
                message: {
                    subject: `${inviter.fullName} Invited You as a Contributor to the "${event.name}" at FlashBack.`,
                    html: `<!DOCTYPE html>
                    <html lang="en">
                      <head>
                        <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                        <link
                          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                          rel="stylesheet"
                        />
                      </head>
                      <body>
                        <table
                          width="100%"
                          style="
                            background-color: #ffffff;
                            font-family: 'Rubik', sans-serif;
                            font-size: 14px;
                            font-weight: 300;
                            line-height: 1.6;
                          "
                        >
                          <tr>
                            <td>
                              <table
                                style="
                                  max-width: 512px;
                                  margin: 0 auto;
                                  background-color: #141414;
                                  padding-bottom: 15px;
                                "
                              >
                                <thead>
                                  <tr>
                                    <th style="padding: 20px">
                                      <img
                                        src="https://flashback.one/email/head.png"
                                        width="100%"
                                      />
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                        <tbody>
                                          <tr>
                                            <td>
                                              Dear {name}.
                                              <br />
                                              You've been invited as a contributor to the Event ${event.name}
                                              at FlashBack platform. Please click on
                                              this link to accept an invitation and use credentials below:
                                            </td>
                                          </tr>
                                          <tr>
                                            <td style="text-align: center; padding: 10px 0">
                                              <a
                                                href="${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/event/managedEvents?id=${newUserId}"
                                                target="_blank"
                                                style="
                                                  text-decoration: none;
                                                  color: #141414;
                                                  background-color: #f5175d;
                                                  font-weight: 700;
                                                  padding: 9px 13px;
                                                  border-radius: 14px;
                                                  font-size: 16px;
                                                "
                                              >
                                                ACCEPT AN INVITATION
                                              </a>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              Your login: ${credentials.login}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              Your password: ${credentials.password}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              FlashBack is a bespoke ticketing platform that enables art-like and edgy tickets for any kind of events.
                                            </td>
                                          <tr>
                                          <tr>
                                            <td>We wish you a great event!</td>
                                          </tr>
                                          <tr>
                                            <td style="padding-top: 20px">Kindest regards,</td>
                                          </tr>
                                          <tr>
                                            <td style="color: #c2ffa8; font-weight: 500">
                                              <img
                                                src="https://flashback.one/email/logo.png"
                                                alt="Logo"
                                                width="30px"
                                                style="
                                                  background-color: #c2ffa8;
                                                  border-radius: 50%;
                                                  vertical-align: middle;
                                                "
                                              />
                                              <span>FlashBack</span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td>
                                      <table style="width: 100%; margin-top: 40px">
                                        <tbody style="text-align: center; font-size: 9px">
                                          <tr>
                                            <td>
                                              <a
                                                href="https://www.facebook.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/facebook.png"
                                                  alt="Facebook"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://instagram.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/instagram.png"
                                                  alt="Instagram"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://flashback.one"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/web.png"
                                                  alt="Web"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>FLASHBACK.ONE</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://www.linkedin.com/company/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/linkedin.png"
                                                  alt="LinkedIn"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://twitter.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/twitter.png"
                                                  alt="Twitter"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown, New Castle, 19709
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      This email was created automatically, please do not reply.
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </body>
                    </html>`,
                    from_name: 'Flashback Team',
                    from_email: this.email,
                    to: [
                        {
                            email: credentials.login,
                        }
                    ],
                    track_opens: true,
                    track_clicks: true
                }
            });

            if (!mail) {
                throw new CustomError({
                    status: 500,
                    message: 'Internal server error: mail service do not work.'
                });
            }

            return {
                status: 200,
                message: 'An email about adding as a event contributor to an unregistered user was sent.'
            };
        } catch (error) {
            throw error
        }
    }

    public async sendEventContributorMessageToRegistredUser(options: {
        event: EventModel,
        sender_userId: string | number,
        contributorId: string | number,
        owner: boolean
    }) {
        const { event, sender_userId, contributorId, owner } = options;
        try {
            const sender = await tryGetUser(sender_userId);
            const newContributor = await tryGetUser(contributorId)
            const mail = await mailchimp.messages.send({
                message: {
                    subject: `${sender.fullName} invited You as a Contributor to the "${event.name}" at FlashBack.`,
                    html: `<!DOCTYPE html>
                    <html lang="en">
                      <head>
                        <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                        <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                        <link
                          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                          rel="stylesheet"
                        />
                      </head>
                      <body>
                        <table
                          width="100%"
                          style="
                            background-color: #ffffff;
                            font-family: 'Rubik', sans-serif;
                            font-size: 14px;
                            font-weight: 300;
                            line-height: 1.6;
                          "
                        >
                          <tr>
                            <td>
                              <table
                                style="
                                  max-width: 512px;
                                  margin: 0 auto;
                                  background-color: #141414;
                                  padding-bottom: 15px;
                                "
                              >
                                <thead>
                                  <tr>
                                    <th style="padding: 20px">
                                      <img
                                        src="https://flashback.one/email/head.png"
                                        width="100%"
                                      />
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                        <tbody>
                                          <tr>
                                            <td>
                                              Dear {name}.
                                              <br />
                                              You've been invited as a contributor to the Event ${event.name}
                                              at FlashBack platform. Please click on
                                              this link to accept an invitation and use credentials below:
                                            </td>
                                          </tr>
                                          <tr>
                                            <td style="text-align: center; padding: 10px 0">
                                              <a
                                                href="${owner ? `${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/event/myEvents?id=${event.id}` : `${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/managedEvents?id=${contributorId}`}"
                                                target="_blank"
                                                style="
                                                  text-decoration: none;
                                                  color: #141414;
                                                  background-color: #f5175d;
                                                  font-weight: 700;
                                                  padding: 9px 13px;
                                                  border-radius: 14px;
                                                  font-size: 16px;
                                                "
                                              >
                                                ACCEPT AN INVITATION
                                              </a>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              FlashBack is a bespoke ticketing platform that enables art-like and edgy tickets for any kind of events.
                                            </td>
                                          <tr>
                                          <tr>
                                            <td>We wish you a great event!</td>
                                          </tr>
                                          <tr>
                                            <td style="padding-top: 20px">Kindest regards,</td>
                                          </tr>
                                          <tr>
                                            <td style="color: #c2ffa8; font-weight: 500">
                                              <img
                                                src="https://flashback.one/email/logo.png"
                                                alt="Logo"
                                                width="30px"
                                                style="
                                                  background-color: #c2ffa8;
                                                  border-radius: 50%;
                                                  vertical-align: middle;
                                                "
                                              />
                                              <span>FlashBack</span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td>
                                      <table style="width: 100%; margin-top: 40px">
                                        <tbody style="text-align: center; font-size: 9px">
                                          <tr>
                                            <td>
                                              <a
                                                href="https://www.facebook.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/facebook.png"
                                                  alt="Facebook"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://instagram.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/instagram.png"
                                                  alt="Instagram"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://flashback.one"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/web.png"
                                                  alt="Web"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>FLASHBACK.ONE</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://www.linkedin.com/company/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/linkedin.png"
                                                  alt="LinkedIn"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                            <td>
                                              <a
                                                href="https://twitter.com/flashbacknft"
                                                target="_blank"
                                                style="text-decoration: none; color: #ffffff"
                                              >
                                                <img
                                                  src="https://flashback.one/email/twitter.png"
                                                  alt="Twitter"
                                                  width="18px"
                                                  style="vertical-align: middle"
                                                />
                                                <span>@flashbacknft</span>
                                              </a>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown, New Castle, 19709
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="text-align: center; font-size: 8px; color: #ffffff">
                                      This email was created automatically, please do not reply.
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </body>
                    </html>`,
                    from_name: 'Flashback Team',
                    from_email: this.email,
                    to: [
                        {
                            email: newContributor.email,
                        }
                    ],
                    track_opens: true,
                    track_clicks: true
                }
            });

            if (!mail) {
                throw new CustomError({
                    status: 500,
                    message: 'Internal server error: mail service do not work.'
                });
            }


            return {
                status: 200,
                message: 'An email about adding as a event contributor to an registered user was sent.'
            };
        } catch (error) {
            throw error
        }
    }

    public async sendResetPasswordMessage( options: {
        user: User,
        resetHash: string
    } ) {

        const { user, resetHash } = options;

        if ( !user && !resetHash ) throw new CustomError({
            status: 400,
            message: "User and resetHash required"
        });
        const resetLink = `${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/reset?token=${resetHash}&email=${user.email.toLowerCase()}`
        const mail = await mailchimp.messages.send({
            message: {
                subject: 'Password reset for FlashBack Platform',
                html: `<!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                    <link
                      href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                      rel="stylesheet"
                    />
                  </head>
                  <body>
                    <table
                      width="100%"
                      style="
                        background-color: #ffffff;
                        font-family: 'Rubik', sans-serif;
                        font-size: 14px;
                        font-weight: 300;
                        line-height: 1.6;
                      "
                    >
                      <tr>
                        <td>
                          <table
                            style="
                              max-width: 512px;
                              margin: 0 auto;
                              background-color: #141414;
                              padding-bottom: 15px;
                            "
                          >
                            <thead>
                              <tr>
                                <th style="padding: 20px">
                                  <img
                                    src="https://flashback.one/email/head.png"
                                    width="100%"
                                  />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                    <tbody>
                                      <tr>
                                        <td>Hi, ${user.fullName}.</td>
                                      </tr>
                                      <tr>
                                        <td>
                                          We received your request to change a password for
                                          FlashBack.
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="text-align: center; padding: 15px 0">
                                          <a
                                            href="${resetLink}"
                                            target="_blank"
                                            style="
                                              text-decoration: none;
                                              color: #141414;
                                              background-color: #f5175d;
                                              font-weight: 700;
                                              padding: 9px 13px;
                                              border-radius: 14px;
                                              font-size: 16px;
                                            "
                                          >
                                            RESET PASSWORD
                                          </a>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>
                                          If you didn’t initiate this request, please contact us
                                          immediately at hello@flashback.group
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="padding-top: 20px">Best regards,</td>
                                      </tr>
                                      <tr>
                                        <td style="color: #c2ffa8; font-weight: 500">
                                          <img
                                            src="https://flashback.one/email/logo.png"
                                            alt="Logo"
                                            width="30px"
                                            style="
                                              background-color: #c2ffa8;
                                              border-radius: 50%;
                                              vertical-align: middle;
                                            "
                                          />
                                          <span>FlashBack</span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr>
                                <td>
                                  <table style="width: 100%; margin-top: 40px">
                                    <tbody style="text-align: center; font-size: 9px">
                                      <tr>
                                        <td>
                                          <a
                                            href="https://www.facebook.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/facebook.png"
                                              alt="Facebook"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://instagram.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/instagram.png"
                                              alt="Instagram"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://flashback.one"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/web.png"
                                              alt="Web"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>FLASHBACK.ONE</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://www.linkedin.com/company/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/linkedin.png"
                                              alt="LinkedIn"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://twitter.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/twitter.png"
                                              alt="Twitter"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align: center; font-size: 8px; color: #ffffff">
                                  FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown, New Castle, 19709
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align: center; font-size: 8px; color: #ffffff">
                                  This email was created automatically, please do not reply.
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>`,
                from_name: 'Flashback Team',
                from_email: this.email,
                to: [
                    {
                        email: user.email.toLowerCase(),
                    }
                ],
                track_opens: true,
                track_clicks: true
            }
        });

        if (!mail) {
            throw new CustomError({
                status: 500,
                message: 'Internal server error: mail service do not work.'
            });
        }

        return {
            status: 200,
            message: 'An email about password reset was sent.'
        }
    }

    public async SupportMessageForOrganizers(options: {
        subject: string,
        name: string,
        email: string,
        text: string
    }) {
        const {subject, name, email, text} = options;

        const mail = await mailchimp.messages.send({
            message: {
                subject,
                html: `
                <p>
                    Message was sent from ${name}.<br>
                    Contact Email: ${email}
                </p>
                

                <p>
                    ${text.replace(/\n/g, '<br>')}
                </p>
                `,
                from_name: 'Flashback Team',
                from_email: this.email,
                to: [
                    {
                        email: this.email
                    }
                ],
                track_opens: true,
                track_clicks: true
            }
        });

        if (!mail) {
            throw new CustomError({
                status: 500,
                message: 'Internal server error: mail service do not work.'
            })
        }

        return {
            status: 200,
            message: 'OK'
        };
    }
    
    public async sendChangeEmailMessage(options: {
        user: User,
        oldEmail: string,
        newEmail: string,
        changeCode: number
    }) {
        const { user, oldEmail, newEmail, changeCode } = options;

        const mail = await mailchimp.messages.send({
            message: {
                subject: 'Secret code for changing your email at FlashBack.',
                html: `<!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                    <link
                      href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                      rel="stylesheet"
                    />
                  </head>
                  <body>
                    <table
                      width="100%"
                      style="
                        background-color: #ffffff;
                        font-family: 'Rubik', sans-serif;
                        font-size: 14px;
                        font-weight: 300;
                        line-height: 1.6;
                      "
                    >
                      <tr>
                        <td>
                          <table
                            style="
                              max-width: 512px;
                              margin: 0 auto;
                              background-color: #141414;
                              padding-bottom: 15px;
                            "
                          >
                            <thead>
                              <tr>
                                <th style="padding: 20px">
                                  <img
                                    src="https://flashback.one/email/head.png"
                                    width="100%"
                                  />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                    <tbody>
                                      <tr>
                                        <td>Dear ${user.fullName},</td>
                                      </tr>
                                      <tr>
                                        <td>
                                          To change email ${oldEmail} for ${newEmail} use this one-time code.
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>
                                          <h2 style="text-align: center">${changeCode}</h1>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>If you did not do this, please ignore this mail.</td>
                                      </tr>
                                      <tr>
                                        <td style="padding-top: 20px">Kindest regards,</td>
                                      </tr>
                                      <tr>
                                        <td style="color: #c2ffa8; font-weight: 500">
                                          <img
                                            src="https://flashback.one/email/logo.png"
                                            alt="Logo"
                                            width="30px"
                                            style="
                                              background-color: #c2ffa8;
                                              border-radius: 50%;
                                              vertical-align: middle;
                                            "
                                          />
                                          <span>FlashBack</span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr>
                                <td>
                                  <table style="width: 100%; margin-top: 40px">
                                    <tbody style="text-align: center; font-size: 9px">
                                      <tr>
                                        <td>
                                          <a
                                            href="https://www.facebook.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/facebook.png"
                                              alt="Facebook"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://instagram.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/instagram.png"
                                              alt="Instagram"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://flashback.one"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/web.png"
                                              alt="Web"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>FLASHBACK.ONE</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://www.linkedin.com/company/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/linkedin.png"
                                              alt="LinkedIn"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://twitter.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/twitter.png"
                                              alt="Twitter"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align: center; font-size: 8px; color: #ffffff">
                                  FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown, New Castle, 19709
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align: center; font-size: 8px; color: #ffffff">
                                  This email was created automatically, please do not reply.
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>`,
                from_name: 'Flashback Team',
                from_email: this.email,
                to: [
                    {
                        email: newEmail.toLowerCase()
                    }
                ],
                track_opens: true,
                track_clicks: true
            }
        });

        if (!mail) {
            throw new CustomError({
                status: 500,
                message: 'Internal server error: mail service do not work.'
            });
        }

        return {
            status: 200,
            message: 'An email with code to change email was sent.'
        }
    }

    public async sendEmailChanged(options: {
        user: User,
        oldEmail: string,
        newEmail: string,
        cancleHash: string
    }) {
        const { user, oldEmail, newEmail, cancleHash } = options;
        const cancleUrl = `${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/email/cancle?hash=${cancleHash}`

        const mail = await mailchimp.messages.send({
            message: {
                subject: 'Your email has been changed at FlashBack',
                html: `<!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                    <link
                      href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;500;700&display=swap"
                      rel="stylesheet"
                    />
                  </head>
                  <body>
                    <table
                      width="100%"
                      style="
                        background-color: #ffffff;
                        font-family: 'Rubik', sans-serif;
                        font-size: 14px;
                        font-weight: 300;
                        line-height: 1.6;
                      "
                    >
                      <tr>
                        <td>
                          <table
                            style="
                              max-width: 512px;
                              margin: 0 auto;
                              background-color: #141414;
                              padding-bottom: 15px;
                            "
                          >
                            <thead>
                              <tr>
                                <th style="padding: 20px">
                                  <img
                                    src="https://flashback.one/email/head.png"
                                    width="100%"
                                  />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <table style="width: 80%; margin: 0 auto; color: #ffffff">
                                    <tbody>
                                      <tr>
                                        <td>Dear ${user.fullName},</td>
                                      </tr>
                                      <tr>
                                        <td>
                                          Your email ${oldEmail} has been changed for ${newEmail} at FlashBack.
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>
                                          If you did not do this, then follow ${cancleUrl} to cancel it.
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>
                                          We recommend that you change your password.
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="padding-top: 20px">Kindest regards,</td>
                                      </tr>
                                      <tr>
                                        <td style="color: #c2ffa8; font-weight: 500">
                                          <img
                                            src="https://flashback.one/email/logo.png"
                                            alt="Logo"
                                            width="30px"
                                            style="
                                              background-color: #c2ffa8;
                                              border-radius: 50%;
                                              vertical-align: middle;
                                            "
                                          />
                                          <span>FlashBack</span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr>
                                <td>
                                  <table style="width: 100%; margin-top: 40px">
                                    <tbody style="text-align: center; font-size: 9px">
                                      <tr>
                                        <td>
                                          <a
                                            href="https://www.facebook.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/facebook.png"
                                              alt="Facebook"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://instagram.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/instagram.png"
                                              alt="Instagram"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://flashback.one"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/web.png"
                                              alt="Web"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>FLASHBACK.ONE</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://www.linkedin.com/company/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/linkedin.png"
                                              alt="LinkedIn"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                        <td>
                                          <a
                                            href="https://twitter.com/flashbacknft"
                                            target="_blank"
                                            style="text-decoration: none; color: #ffffff"
                                          >
                                            <img
                                              src="https://flashback.one/email/twitter.png"
                                              alt="Twitter"
                                              width="18px"
                                              style="vertical-align: middle"
                                            />
                                            <span>@flashbacknft</span>
                                          </a>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align: center; font-size: 8px; color: #ffffff">
                                  FlashBack One, Inc., 651 N Broad St, Suite 206, Middletown, New Castle, 19709
                                </td>
                              </tr>
                              <tr>
                                <td style="text-align: center; font-size: 8px; color: #ffffff">
                                  This email was created automatically, please do not reply.
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>`,
                from_name: 'Flashback Team',
                from_email: this.email,
                to: [
                    {
                        email: oldEmail.toLowerCase()
                    }
                ],
                track_opens: true,
                track_clicks: true
            }
        });

        if (!mail) {
            throw new CustomError({
                status: 500,
                message: 'Internal server error: mail service do not work.'
            });
        }

        return {
            status: 200,
            message: 'An email about email changed was sent.'
        }

    }
}
