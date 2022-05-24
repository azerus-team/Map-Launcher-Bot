const fs = require('fs');
const SharedConstants = require('./SharedConstants');

class Logger {
    static prefix = (date) => {
        return `[${(""+date.getDate()).padStart(2,"0")}` +
        `.${((date.getMonth() + 1)+"").padStart(2, "0")}` +
        `.${date.getFullYear()} ` +

        `${(date.getHours()+"").padStart(2, "0")}` +
        `:${(date.getMinutes()+"").padStart(2, "0")}` +
        `:${(date.getSeconds()+"").padStart(2, "0")}]`

    }
    static fatal(message) {
        let date = new Date();
        let prefix = Logger.prefix(date) + " [FATAL] ";
        let out = prefix + message;
        Logger.writeToFile(out);
        console.error(out);
        process.exit(0);
    }
    static log(message) {
        let date = new Date();
        let prefix = Logger.prefix(date) + " [LOG] ";
        let out = prefix + message;
        Logger.writeToFile(out);
        console.log(out);
    }
    static debug(message) {
        if (!process.env.DEBUG) return;
        let date = new Date();
        let prefix = Logger.prefix(date) + " [DEBUG] ";
        let out = prefix + message;
        Logger.writeToFile(out);
        console.log(out);
    }
    static warn(message) {
        let date = new Date();
        let prefix = Logger.prefix(date) + " [WARN] ";
        let out = prefix + message;
        Logger.writeToFile(out);
        console.log(out);
    }
    static writeToFile(message) {
        let date = new Date();
        let fileName =`${(""+date.getDate()).padStart(2,"0")}` +
            `-${((date.getMonth() + 1)+"").padStart(2, "0")}` +
            `-${date.getFullYear()}.log`
        fs.appendFile(SharedConstants.logsFolder + "/" + fileName, message + "\n", () => {})
    }
}
module.exports = Logger;