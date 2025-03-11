import * as vscode from 'vscode';
import axios, { AxiosResponse } from 'axios';
import * as https from 'https';

/**
 * Server configuration interface
 */
export interface ServerConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    namespace: string;
    ssl?: boolean;
}

// Create a global output channel
const outputChannel = vscode.window.createOutputChannel('REST API Debug');

// Force show output channel
outputChannel.show(true);  // true parameter will force the output channel to the foreground

/**
 * Log debug information
 */
function logDebug(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);  // Also output to developer tools console
    outputChannel.appendLine(logMessage);
    // Force update view
    outputChannel.show(false);  // false parameter won't force to foreground
}

/**
 * Update cookies
 * @param setCookies Cookies to set
 * @param server Server configuration
 */
async function updateCookies(setCookies: string[], server: ServerConfig): Promise<string[]> {
    logDebug('Starting to update cookies');
    const cookies: string[] = [];
    for (const cookie of setCookies) {
        const parts = cookie.split(';')[0].split('=');
        if (parts.length === 2) {
            cookies.push(`${parts[0]}=${parts[1]}`);
            logDebug(`Adding cookie: ${parts[0]}=${parts[1]}`);
        }
    }
    logDebug(`Updated cookies: ${cookies.join(', ')}`);
    return cookies;
}

/**
 * Make REST request to server
 * @param method HTTP method
 * @param apiVersion API version
 * @param path Request path
 * @param server Server configuration
 * @param data Request data
 */
export async function makeRESTRequest(
    method: string,
    apiVersion: number,
    path: string,
    server: ServerConfig,
    data?: any
): Promise<AxiosResponse | undefined> {
    logDebug(`Starting REST request: ${method} ${path}`);
    logDebug(`API Version: ${apiVersion}`);
    logDebug(`Request path: ${path}`);
    logDebug(`Server config: ${JSON.stringify({ ...server, password: '******' }, null, 2)}`);
    
    try {
        // Build URL
        const protocol = server.ssl ? 'https' : 'http';
        const url = `${protocol}://${server.host}:${server.port}/api/atelier/v${apiVersion}/${server.namespace}${path}`;
        logDebug(`Complete URL: ${url}`);

        if (data) {
            logDebug(`Request data: ${JSON.stringify(data, null, 2)}`);
        }

        // Create HTTPS agent
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });
        logDebug('Created HTTPS agent (allowing self-signed certificates)');

        // Build request configuration
        const requestConfig = {
            method: method,
            url: url,
            headers: {
                'Content-Type': 'application/json'
            },
            auth: {
                username: server.username,
                password: server.password
            },
            withCredentials: true,
            httpsAgent,
            ...(data && { data })
        };

        logDebug('Sending request...');
        const response = await axios.request(requestConfig);
        logDebug(`Request successful! Status code: ${response.status}`);
        logDebug(`Response headers: ${JSON.stringify(response.headers, null, 2)}`);
        logDebug(`Response data: ${JSON.stringify(response.data, null, 2)}`);

        // Update cookies
        if (response.headers['set-cookie']) {
            logDebug('Updating Cookies...');
            await updateCookies(response.headers['set-cookie'], server);
        }

        return response;
    } catch (error: any) {
        logDebug('=== Request Failed ===');
        if (axios.isAxiosError(error)) {
            logDebug(`Axios error: ${error.message}`);
            if (error.response) {
                logDebug(`Error status code: ${error.response.status}`);
                logDebug(`Error response data: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            if (error.config) {
                logDebug(`Failed request configuration: ${JSON.stringify({
                    ...error.config,
                    auth: '******'  // Hide authentication information
                }, null, 2)}`);
            }
        } else {
            logDebug(`Non-Axios error: ${error.message}`);
        }
        throw error;  // Throw error for caller to handle
    } finally {
        logDebug('REST request completed');
    }
} 