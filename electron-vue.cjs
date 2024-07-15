const fs = require("fs");
const child = require("child_process");
if (fs.existsSync("tsconfig.app.json")) fs.rmSync("tsconfig.app.json");
fs.writeFileSync(
	"tsconfig.node.json",
	`{
  "compilerOptions": {
    "composite": true,
    "module": "esnext",
    "moduleResolution": "node"
  },
  "include": ["vite.config.ts"]
}
`
);
fs.writeFileSync(
	"tsconfig.json",
	`{
	"compilerOptions": {
		"target": "esnext",
		"useDefineForClassFields": true,
		"module": "es2022",
		"moduleResolution": "node",
		"strict": true,
		"jsx": "preserve",
		"sourceMap": true,
		"resolveJsonModule": true,
		"isolatedModules": false,
		"esModuleInterop": true,
		"lib": ["esnext", "dom"],
		"skipLibCheck": true,
		"outDir": "dist/electron"
	},
	"include": ["src/electron/**/*"],
	"references": [
		{
			"path": "./tsconfig.node.json"
		}
	]
}
`
);
const pkgFile = JSON.parse(fs.readFileSync("package.json"));
const pkg = {
	name: pkgFile.name,
	version: pkgFile.version,
	type: "module",
	main: "dist/electron/main.js",
	scripts: {
		"vite:dev": "vite",
		"vite:build": "vue-tsc --noEmit && vite build",
		"vite:preview": "vite preview",
		ts: "tsc",
		watch: "tsc -w",
		lint: "eslint -c .eslintrc --ext .ts ./src",
		"app:dev": 'tsc && concurrently vite " electron ." "tsc -w"',
		"app:build": "npm run vite:build && tsc && electron-builder",
		"app:preview": "npm run vite:build && tsc && electron .",
	},
	build: {
		directories: {
			output: "release/${version}",
		},
		files: ["dist"],
		win: {
			artifactName: "${productName}_${version}.${ext}",
		},
		nsis: {
			oneClick: false,
			perMachine: true,
			allowToChangeInstallationDirectory: true,
		},
	},
};
pkg.dependencies = pkgFile.dependencies;
pkg.devDependencies = pkgFile.devDependencies;
fs.writeFileSync("package.json", JSON.stringify(pkg, undefined, "\t"));
if (!fs.existsSync("src/electron")) fs.mkdirSync("src/electron");
fs.writeFileSync(
	"src/electron/main.ts",
	`// Modules to control application life and create native browser window
import { app, BrowserWindow } from "electron";
import path from "node:path";

const __dirname = import.meta.dirname;

const dev = !app.isPackaged;

function createWindow() {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});

	// and load the index.html of the app.
	if (dev) mainWindow.loadURL("http://localhost:5173");
	else mainWindow.loadFile("index.html");

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	createWindow();

	app.on("activate", function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
	if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
`
);
fs.writeFileSync(
	"src/electron/preload.ts",
	`/**
 * The preload script runs before \`index.html\` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
window.addEventListener("DOMContentLoaded", () => {
	const replaceText = (selector: string, text: string) => {
		const element = document.getElementById(selector);
		if (element) element.innerText = text;
	};

	for (const type of ["chrome", "node", "electron"]) {
		replaceText(\`\${type}-version\`, process.versions[type]!);
	}
});
`
);
child.execSync("yarn add -D electron electron-builder concurrently @types/node", { stdio: "inherit" });
