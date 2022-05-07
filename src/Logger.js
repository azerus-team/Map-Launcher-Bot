

class Logger {
    static prefix = (date) => {
        return `[${(""+date.getDate()).padStart(2,"0")}` +
        `.${((date.getMonth() + 1)+"").padStart(2, "0")}` +
        `.${date.getFullYear()} ` +

        `${(date.getHours()+"").padStart(2, "0")}` +
        `:${(date.getMinutes()+"").padStart(2, "0")}]` +
        `:${(date.getSeconds()+"").padStart(2, "0")}]`

    }
    static fatal(message) {
        let date = new Date();
        let prefix = Logger.prefix(date) + " [FATAL] ";
        console.error(prefix + message);
        process.exit(0);
    }
    static log(message) {
        let date = new Date();
        let prefix = Logger.prefix(date) + " [LOG] ";
        console.log(prefix + message);
    }
    static debug(message) {
        if (!process.env.DEBUG) return;
        let date = new Date();
        let prefix = Logger.prefix(date) + " [DEBUG] ";
        console.log(prefix + message);
    }
    static warn(message) {
        let date = new Date();
        let prefix = Logger.prefix(date) + " [WARN] ";
        console.log(prefix + message);
    }
}
module.exports = Logger;