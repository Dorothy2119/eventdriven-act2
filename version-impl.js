"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionCommand = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const command_1 = require("../models/command");
const color_1 = require("../utilities/color");
const package_manager_1 = require("../utilities/package-manager");
/**
 * Major versions of Node.js that are officially supported by Angular.
 */
const SUPPORTED_NODE_MAJORS = [12, 14];
class VersionCommand extends command_1.Command {
    async run() {
        const cliPackage = require('../package.json');
        let workspacePackage;
        try {
            workspacePackage = require(path.resolve(this.context.root, 'package.json'));
        }
        catch { }
        const [nodeMajor] = process.versions.node.split('.').map((part) => Number(part));
        const unsupportedNodeVersion = !SUPPORTED_NODE_MAJORS.includes(nodeMajor);
        const patterns = [
            /^@angular\/.*/,
            /^@angular-devkit\/.*/,
            /^@bazel\/.*/,
            /^@ngtools\/.*/,
            /^@nguniversal\/.*/,
            /^@schematics\/.*/,
            /^rxjs$/,
            /^typescript$/,
            /^ng-packagr$/,
            /^webpack$/,
        ];
        const packageNames = [
            ...Object.keys(cliPackage.dependencies || {}),
            ...Object.keys(cliPackage.devDependencies || {}),
            ...Object.keys((workspacePackage === null || workspacePackage === void 0 ? void 0 : workspacePackage.dependencies) || {}),
            ...Object.keys((workspacePackage === null || workspacePackage === void 0 ? void 0 : workspacePackage.devDependencies) || {}),
        ];
        const versions = packageNames
            .filter((x) => patterns.some((p) => p.test(x)))
            .reduce((acc, name) => {
            if (name in acc) {
                return acc;
            }
            acc[name] = this.getVersion(name);
            return acc;
        }, {});
        const ngCliVersion = cliPackage.version;
        let angularCoreVersion = '';
        const angularSameAsCore = [];
        if (workspacePackage) {
            // Filter all angular versions that are the same as core.
            angularCoreVersion = versions['@angular/core'];
            if (angularCoreVersion) {
                for (const angularPackage of Object.keys(versions)) {
                    if (versions[angularPackage] == angularCoreVersion &&
                        angularPackage.startsWith('@angular/')) {
                        angularSameAsCore.push(angularPackage.replace(/^@angular\//, ''));
                        delete versions[angularPackage];
                    }
                }
                // Make sure we list them in alphabetical order.
                angularSameAsCore.sort();
            }
        }
        const namePad = ' '.repeat(Object.keys(versions).sort((a, b) => b.length - a.length)[0].length + 3);
        const asciiArt = `
     _                      _                 ____ _     ___
    / \\   _ __   __ _ _   _| | __ _ _ __     / ___| |   |_ _|
   / △ \\ | '_ \\ / _\` | | | | |/ _\` | '__|   | |   | |    | |
  / ___ \\| | | | (_| | |_| | | (_| | |      | |___| |___ | |
 /_/   \\_\\_| |_|\\__, |\\__,_|_|\\__,_|_|       \\____|_____|___|
                |___/
    `
            .split('\n')
            .map((x) => color_1.colors.red(x))
            .join('\n');
        this.logger.info(asciiArt);
        this.logger.info(`
      Angular CLI: ${ngCliVersion}
      Node: ${process.versions.node}${unsupportedNodeVersion ? ' (Unsupported)' : ''}
      Package Manager: ${await this.getPackageManager()}
      OS: ${process.platform} ${process.arch}

      Angular: ${angularCoreVersion}
      ... ${angularSameAsCore
            .reduce((acc, name) => {
            // Perform a simple word wrap around 60.
            if (acc.length == 0) {
                return [name];
            }
            const line = acc[acc.length - 1] + ', ' + name;
            if (line.length > 60) {
                acc.push(name);
            }
            else {
                acc[acc.length - 1] = line;
            }
            return acc;
        }, [])
            .join('\n... ')}

      Package${namePad.slice(7)}Version
      -------${namePad.replace(/ /g, '-')}------------------
      ${Object.keys(versions)
            .map((module) => `${module}${namePad.slice(module.length)}${versions[module]}`)
            .sort()
            .join('\n')}
    `.replace(/^ {6}/gm, ''));
        if (unsupportedNodeVersion) {
            this.logger.warn(`Warning: The current version of Node (${process.versions.node}) is not supported by Angular.`);
        }
    }
    getVersion(moduleName) {
        let packagePath;
        let cliOnly = false;
        // Try to find the package in the workspace
        try {
            packagePath = require.resolve(`${moduleName}/package.json`, { paths: [this.context.root] });
        }
        catch { }
        // If not found, try to find within the CLI
        if (!packagePath) {
            try {
                packagePath = require.resolve(`${moduleName}/package.json`);
                cliOnly = true;
            }
            catch { }
        }
        let version;
        // If found, attempt to get the version
        if (packagePath) {
            try {
                version = require(packagePath).version + (cliOnly ? ' (cli-only)' : '');
            }
            catch { }
        }
        return version || '<error>';
    }
    async getPackageManager() {
        try {
            const manager = await package_manager_1.getPackageManager(this.context.root);
            const version = child_process_1.execSync(`${manager} --version`, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
                env: {
                    ...process.env,
                    //  NPM updater notifier will prevents the child process from closing until it timeout after 3 minutes.
                    NO_UPDATE_NOTIFIER: '1',
                    NPM_CONFIG_UPDATE_NOTIFIER: 'false',
                },
            }).trim();
            return `${manager} ${version}`;
        }
        catch {
            return '<error>';
        }
    }
}
exports.VersionCommand = VersionCommand;
VersionCommand.aliases = ['v'];
