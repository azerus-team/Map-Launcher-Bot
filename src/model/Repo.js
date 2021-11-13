
class Repo {
    /**
     * @type {String}
     */
    name;
    /**
     * @type {String}
     */
    owner;
    constructor(repo) {
        this.owner = repo["owner"];
        this.name = repo["repo-name"];
    }
    get owner() {
        return this.owner;
    }
    get name() {
        return this.name;
    }
    set setName(name) {
        this.name = name;
    }
    set setOwner(owner) {
        this.owner = owner;
    }
}
module.exports = Repo;