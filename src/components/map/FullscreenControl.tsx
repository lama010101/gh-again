
import React, { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Add global type for TypeScript
declare global {
  interface Document {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  }
  
  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  }
}

const FullscreenControl = () => {
  const map = useMap();
  const mapContainerRef = useRef<HTMLElement | null>(null);
  
  const toggleFullscreen = useCallback(async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    
    const doc = document;
    const docEl = doc.documentElement;
    const container = mapContainerRef.current;
    
    if (!container) return;
    
    try {
      // Find all HUD elements
      const hudElements = document.querySelectorAll('.hud-element');
      const overlayContainer = document.querySelector('#root > div > div:first-child');
      
      if (!doc.fullscreenElement && 
          !doc.webkitFullscreenElement && 
          !(doc as any).mozFullScreenElement && 
          !(doc as any).msFullscreenElement) {
        // Enter fullscreen
        
        // First, directly hide all HUD elements before entering fullscreen
        hudElements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          }
        });
        
        // Also directly hide any overlay container
        if (overlayContainer instanceof HTMLElement) {
          overlayContainer.style.display = 'none';
          overlayContainer.style.visibility = 'hidden';
        }
        
        // Now enter fullscreen
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        }
        
        // Add classes for CSS selectors
        container.classList.add('leaflet-fullscreen-on');
        document.body.classList.add('map-fullscreen-active');
      } else {
        // Exit fullscreen
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if ((doc as any).mozCancelFullScreen) {
          await (doc as any).mozCancelFullScreen();
        } else if ((doc as any).msExitFullscreen) {
          await (doc as any).msExitFullscreen();
        }
        
        // Remove fullscreen classes
        container.classList.remove('leaflet-fullscreen-on');
        document.body.classList.remove('map-fullscreen-active');
        
        // Show HUD elements again
        setTimeout(() => {
          hudElements.forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.display = '';
              el.style.visibility = '';
              el.style.opacity = '';
              el.style.pointerEvents = '';
            }
          });
          
          // Show overlay container again
          if (overlayContainer instanceof HTMLElement) {
            overlayContainer.style.display = '';
            overlayContainer.style.visibility = '';
          }
        }, 100);
      }
      
      // Force update map size after a short delay to ensure proper rendering
      setTimeout(() => map.invalidateSize(), 100);
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  }, [map]);
  
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const container = map.getContainer();
    container.style.position = 'relative'; // Ensure proper positioning context
    mapContainerRef.current = container;
    
    // Create our own fullscreen control
    const FullscreenControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-control-fullscreen leaflet-bar leaflet-control');
        const button = L.DomUtil.create('a', 'leaflet-control-fullscreen-button', container);
        button.href = '#';
        button.title = 'View Fullscreen';
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/></svg>';
        
        L.DomEvent.on(button, 'click', toggleFullscreen);
        
        return container;
      }
    });
    
    // Add the control to the map
    const fullscreenControl = new FullscreenControl();
    map.addControl(fullscreenControl);
    
    // Handle fullscreen change events
    const handleFullscreenChange = () => {
      const fullscreenButton = document.querySelector('.leaflet-control-fullscreen-button');
      const isFullscreen = document.fullscreenElement !== null || 
                         (document as any).webkitFullscreenElement !== null ||
                         (document as any).mozFullScreenElement !== null ||
                         (document as any).msFullscreenElement !== null;
      
      if (isFullscreen) {
        // Entering fullscreen
        if (fullscreenButton) {
          (fullscreenButton as HTMLElement).title = 'Exit Fullscreen';
        }
        if (mapContainerRef.current) {
          mapContainerRef.current.classList.add('leaflet-fullscreen-on');
          document.body.classList.add('map-fullscreen-active');
        }
      } else {
        // Exiting fullscreen
        if (fullscreenButton) {
          (fullscreenButton as HTMLElement).title = 'View Fullscreen';
          const container = fullscreenButton.parentElement;
          if (container) {
            L.DomUtil.removeClass(container, 'leaflet-fullscreen-on');
          }
        }
        if (mapContainerRef.current) {
          mapContainerRef.current.classList.remove('leaflet-fullscreen-on');
          document.body.classList.remove('map-fullscreen-active');
        }
      }
      
      // Force update map size after a short delay to ensure proper rendering
      setTimeout(() => map.invalidateSize(), 100);
    };
    
    // Add event listeners for all fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [map, toggleFullscreen]);
  
  return null;
};

export default FullscreenControl;
