import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import FileType from "file-type";
import gm from "gm";

const GM = gm.subClass({ imageMagick: true });
dotenv.config();

export default class File {
    base64Regex: RegExp =
        /^([A-Za-z0-9+\/]{4})*([A-Za-z0-9+\/]{3}=|[A-Za-z0-9+\/]{2}==)?$/g;
    private baseFolder: string;
    constructor(baseFolder?) {
        if (!baseFolder) baseFolder = "images";

        const pathPreamble = `${__dirname}/../../public/`;
        this.baseFolder = path.join(pathPreamble, baseFolder);
        if (
            !fs.existsSync(this.baseFolder) ||
            !fs.lstatSync(this.baseFolder).isDirectory()
        ) {
            fs.mkdirSync(this.baseFolder);
        }
        this.baseFolder = baseFolder;
    }
    public async uploadFile(options: {
        file: string;
        isTicketBanner?: boolean;
    }) {
        const { file, isTicketBanner } = options;

        if (!file) {
            return undefined;
        }

        // if (file.search(this.base64Regex) === -1) {
        //     return undefined;
        // }

        const buff = Buffer.from(file, "base64");
        const fileTypeInfo = await FileType.fromBuffer(buff);
        const fileName = await crypto.randomBytes(64).toString("hex");
        const date = new Date();
        const filePath = `${this.baseFolder}/${fileName}.${date.getTime()}.${
            fileTypeInfo.ext
        }`;

        function getImgIdentify(image: any) {
            return new Promise((resolve, reject) => {
                image.identify((err, data) => {
                    if (!err) resolve(data);
                    if (err) reject(err);
                });
            });
        }

        if (fileTypeInfo.mime === "image/gif") {
            let image = await GM(buff);
            let imageInfo: any = await getImgIdentify(image);

            if (!isTicketBanner) {
                if (imageInfo.size.width != imageInfo.size.height) {
                    let maxSize =
                        imageInfo.size.width < imageInfo.size.height
                            ? imageInfo.size.height
                            : imageInfo.size.width;
                    image.resize(maxSize, maxSize);
                }
            }

            image.write(
                `${__dirname}/../../public/${filePath}`,
                function (err) {
                    if (!err) console.log("done");
                }
            );
        } else {
            fs.writeFileSync(
                path.resolve(`${__dirname}/../../public/${filePath}`),
                buff
            );
        }

        return {
            status: 200,
            message: "OK",
            filePath,
        };
    }

    public async deleteFile(options: { filePath: string }) {
        const { filePath } = options;

        if (!filePath) {
            return undefined;
        }

        if (
            !fs.existsSync(
                path.resolve(`${__dirname}/../../public/${filePath}`)
            )
        ) {
            return undefined;
        }

        fs.unlinkSync(path.resolve(`${__dirname}/../../public/${filePath}`));

        return {
            status: 200,
            message: "OK",
        };
    }
}
