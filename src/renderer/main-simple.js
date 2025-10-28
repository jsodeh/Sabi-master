/**
 * Simplified main renderer process script for debugging
 */

// Global state
let isInitialized = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Starting initialization');
    
    try {
        await initializeApplication();
        
        console.log('Basic initialization complete, starting timer...');
        
        // Simulate initialization process
        setTimeout(() => {
            console.log('Timer completed, calling completeInitialization...');
            completeInitialization();
        }, 2000);

    } catch (error) {
        console.error('Failed to initialize application:', error);
        showInitializationError();
    }
});

async function initializeApplication() {
    console.log('initializeApplication called');
    
    // Get and display version info
    try {
        const version = await window.sabiAPI?.app?.getVersion?.() || '1.0.0';
        console.log('App version:', version);
        
        const versionElement = document.querySelector('.version-info');
        if (versionElement) {
            versionElement.textContent = `v${version}`;
        }
    } catch (error) {
        console.warn('Could not get version info:', error);
    }

    // Listen for window events if available
    try {
        window.sabiAPI?.window?.onResized?.((data) => {
            console.log('Window resized:', data);
        });

        window.sabiAPI?.window?.onMoved?.((data) => {
            console.log('Window moved:', data);
        });
    } catch (error) {
        console.warn('Window event listeners not available:', error);
    }

    console.log('initializeApplication completed');
}

function completeInitialization() {
    console.log('completeInitialization called');
    
    const statusElement = document.querySelector('.status');
    const getStartedBtn = document.querySelector('.get-started-btn');
    
    console.log('Status element:', statusElement);
    console.log('Get started button:', getStartedBtn);
    
    if (statusElement) {
        statusElement.innerHTML = '✓ Learning environment ready';
        statusElement.style.background = 'rgba(40, 202, 66, 0.2)';
        statusElement.style.borderColor = 'rgba(40, 202, 66, 0.4)';
        console.log('Updated status element');
    }
    
    if (getStartedBtn) {
        getStartedBtn.style.display = 'block';
        console.log('Showed get started button');
    }
    
    isInitialized = true;
    console.log('Sabi application initialized successfully');
}

function showInitializationError() {
    console.log('showInitializationError called');
    
    const statusElement = document.querySelector('.status');
    if (statusElement) {
        statusElement.innerHTML = '⚠ Initialization failed';
        statusElement.style.background = 'rgba(255, 95, 87, 0.2)';
        statusElement.style.borderColor = 'rgba(255, 95, 87, 0.4)';
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

console.log('main-simple.js loaded');