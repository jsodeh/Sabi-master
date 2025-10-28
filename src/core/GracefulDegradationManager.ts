import { EventEmitter } from 'events';
import {
  SystemError,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy
} from '../types/errors';
import { BuilderType } from '../types/common';

export enum DegradationLevel {
  FULL_FUNCTIONALITY = 'full',
  REDUCED_FUNCTIONALITY = 'reduced',
  BASIC_FUNCTIONALITY = 'basic',
  OFFLINE_MODE = 'offline',
  EMERGENCY_MODE = 'emergency'
}

export enum SystemComponent {
  BROWSER_AUTOMATION = 'browser_automation',
  AI_PROCESSING = 'ai_processing',
  NETWORK_CONNECTIVITY = 'network_connectivity',
  USER_INTERFACE = 'user_interface',
  DATA_STORAGE = 'data_storage',
  AUTHENTICATION = 'authentication'
}

export interface ComponentHealth {
  component: SystemComponent;
  status: HealthStatus;
  lastCheck: Date;
  errorCount: number;
  responseTime: number;
  availability: number; // 0-1 scale
  degradationLevel: DegradationLevel;
  fallbacksAvailable: string[];
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  FAILING = 'failing',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown'
}

export interface DegradationStrategy {
  id: string;
  name: string;
  description: string;
  targetComponent: SystemComponent;
  triggerConditions: DegradationTrigger[];
  fallbackActions: FallbackAction[];
  priority: number;
  enabled: boolean;
}

export interface DegradationTrigger {
  type: 'error_rate' | 'response_time' | 'availability' | 'manual';
  threshold: number;
  timeWindow: number; // in milliseconds
  condition: 'greater_than' | 'less_than' | 'equals';
}

export interface FallbackAction {
  id: string;
  type: 'disable_feature' | 'use_alternative' | 'cache_fallback' | 'manual_mode' | 'offline_mode';
  description: string;
  execute: () => Promise<FallbackResult>;
  rollback: () => Promise<void>;
  estimatedImpact: 'low' | 'medium' | 'high';
}

export interface FallbackResult {
  success: boolean;
  message: string;
  newDegradationLevel: DegradationLevel;
  affectedFeatures: string[];
  userMessage: string;
}

export interface SystemHealthReport {
  overallHealth: HealthStatus;
  degradationLevel: DegradationLevel;
  components: ComponentHealth[];
  activeStrategies: string[];
  recommendations: string[];
  timestamp: Date;
}

export class GracefulDegradationManager extends EventEmitter {
  private componentHealth: Map<SystemComponent, ComponentHealth> = new Map();
  private degradationStrategies: Map<string, DegradationStrategy> = new Map();
  private activeStrategies: Set<string> = new Set();
  private currentDegradationLevel: DegradationLevel = DegradationLevel.FULL_FUNCTIONALITY;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private offlineCapabilities: Map<string, OfflineCapability> = new Map();

  constructor() {
    super();
    this.initializeComponentHealth();
    this.initializeDegradationStrategies();
    this.initializeOfflineCapabilities();
    this.startHealthMonitoring();
  }

  /**
   * Initialize component health tracking
   */
  private initializeComponentHealth(): void {
    const components = [
      {
        component: SystemComponent.BROWSER_AUTOMATION,
        criticalityLevel: 'critical' as const,
        fallbacksAvailable: ['manual_mode', 'screenshot_analysis', 'simplified_automation']
      },
      {
        component: SystemComponent.AI_PROCESSING,
        criticalityLevel: 'high' as const,
        fallbacksAvailable: ['fallback_model', 'template_responses', 'rule_based_processing']
      },
      {
        component: SystemComponent.NETWORK_CONNECTIVITY,
        criticalityLevel: 'high' as const,
        fallbacksAvailable: ['offline_mode', 'cached_data', 'local_processing']
      },
      {
        component: SystemComponent.USER_INTERFACE,
        criticalityLevel: 'medium' as const,
        fallbacksAvailable: ['simplified_ui', 'text_mode', 'basic_controls']
      },
      {
        component: SystemComponent.DATA_STORAGE,
        criticalityLevel: 'medium' as const,
        fallbacksAvailable: ['memory_storage', 'local_storage', 'read_only_mode']
      },
      {
        component: SystemComponent.AUTHENTICATION,
        criticalityLevel: 'low' as const,
        fallbacksAvailable: ['guest_mode', 'cached_auth', 'limited_access']
      }
    ];

    components.forEach(({ component, criticalityLevel, fallbacksAvailable }) => {
      this.componentHealth.set(component, {
        component,
        status: HealthStatus.HEALTHY,
        lastCheck: new Date(),
        errorCount: 0,
        responseTime: 0,
        availability: 1.0,
        degradationLevel: DegradationLevel.FULL_FUNCTIONALITY,
        fallbacksAvailable,
        criticalityLevel
      });
    });
  }

  /**
   * Initialize degradation strategies
   */
  private initializeDegradationStrategies(): void {
    // Browser automation degradation
    this.degradationStrategies.set('browser-automation-fallback', {
      id: 'browser-automation-fallback',
      name: 'Browser Automation Fallback',
      description: 'Switch to manual mode when browser automation fails',
      targetComponent: SystemComponent.BROWSER_AUTOMATION,
      triggerConditions: [
        {
          type: 'error_rate',
          threshold: 0.5,
          timeWindow: 60000,
          condition: 'greater_than'
        }
      ],
      fallbackActions: [
        {
          id: 'enable-manual-mode',
          type: 'manual_mode',
          description: 'Enable manual interaction mode',
          execute: async () => this.enableManualMode(),
          rollback: async () => this.disableManualMode(),
          estimatedImpact: 'medium'
        }
      ],
      priority: 1,
      enabled: true
    });

    // AI processing degradation
    this.degradationStrategies.set('ai-processing-fallback', {
      id: 'ai-processing-fallback',
      name: 'AI Processing Fallback',
      description: 'Use template responses when AI processing fails',
      targetComponent: SystemComponent.AI_PROCESSING,
      triggerConditions: [
        {
          type: 'availability',
          threshold: 0.8,
          timeWindow: 300000,
          condition: 'less_than'
        }
      ],
      fallbackActions: [
        {
          id: 'use-templates',
          type: 'use_alternative',
          description: 'Use template-based responses',
          execute: async () => this.enableTemplateMode(),
          rollback: async () => this.disableTemplateMode(),
          estimatedImpact: 'high'
        }
      ],
      priority: 2,
      enabled: true
    });

    // Network connectivity degradation
    this.degradationStrategies.set('network-offline-mode', {
      id: 'network-offline-mode',
      name: 'Network Offline Mode',
      description: 'Switch to offline mode when network is unavailable',
      targetComponent: SystemComponent.NETWORK_CONNECTIVITY,
      triggerConditions: [
        {
          type: 'availability',
          threshold: 0.1,
          timeWindow: 30000,
          condition: 'less_than'
        }
      ],
      fallbackActions: [
        {
          id: 'enable-offline',
          type: 'offline_mode',
          description: 'Enable offline mode with cached data',
          execute: async () => this.enableOfflineMode(),
          rollback: async () => this.disableOfflineMode(),
          estimatedImpact: 'high'
        }
      ],
      priority: 3,
      enabled: true
    });
  }

  /**
   * Initialize offline capabilities
   */
  private initializeOfflineCapabilities(): void {
    this.offlineCapabilities.set('basic-learning', {
      id: 'basic-learning',
      name: 'Basic Learning Mode',
      description: 'Provide basic learning functionality without network',
      requiredComponents: [SystemComponent.USER_INTERFACE, SystemComponent.DATA_STORAGE],
      features: ['cached_content', 'local_progress', 'basic_explanations'],
      limitations: ['no_live_tools', 'no_ai_processing', 'limited_content']
    });

    this.offlineCapabilities.set('manual-guidance', {
      id: 'manual-guidance',
      name: 'Manual Guidance Mode',
      description: 'Provide step-by-step manual instructions',
      requiredComponents: [SystemComponent.USER_INTERFACE],
      features: ['text_instructions', 'static_screenshots', 'progress_tracking'],
      limitations: ['no_automation', 'no_real_time_help', 'limited_interactivity']
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform health check on all components
   */
  private async performHealthCheck(): Promise<void> {
    for (const [component, health] of this.componentHealth.entries()) {
      try {
        const newHealth = await this.checkComponentHealth(component);
        this.updateComponentHealth(component, newHealth);
        
        // Check if degradation is needed
        await this.evaluateDegradationTriggers(component);
      } catch (error) {
        console.error(`Health check failed for ${component}:`, error);
        this.updateComponentHealth(component, {
          status: HealthStatus.UNKNOWN,
          errorCount: health.errorCount + 1
        });
      }
    }

    this.updateOverallDegradationLevel();
    this.emit('health-check-complete', this.getSystemHealthReport());
  }

  /**
   * Check health of specific component
   */
  private async checkComponentHealth(component: SystemComponent): Promise<Partial<ComponentHealth>> {
    const startTime = Date.now();
    
    switch (component) {
      case SystemComponent.BROWSER_AUTOMATION:
        return await this.checkBrowserAutomationHealth();
      case SystemComponent.AI_PROCESSING:
        return await this.checkAIProcessingHealth();
      case SystemComponent.NETWORK_CONNECTIVITY:
        return await this.checkNetworkHealth();
      case SystemComponent.USER_INTERFACE:
        return await this.checkUIHealth();
      case SystemComponent.DATA_STORAGE:
        return await this.checkDataStorageHealth();
      case SystemComponent.AUTHENTICATION:
        return await this.checkAuthenticationHealth();
      default:
        return {
          status: HealthStatus.UNKNOWN,
          responseTime: Date.now() - startTime
        };
    }
  }

  /**
   * Component-specific health checks
   */
  private async checkBrowserAutomationHealth(): Promise<Partial<ComponentHealth>> {
    // Simulate browser automation health check
    const responseTime = Math.random() * 1000;
    const errorRate = Math.random() * 0.1;
    
    return {
      status: errorRate > 0.05 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
      responseTime,
      availability: 1 - errorRate,
      lastCheck: new Date()
    };
  }

  private async checkAIProcessingHealth(): Promise<Partial<ComponentHealth>> {
    // Simulate AI processing health check
    const responseTime = Math.random() * 2000;
    const availability = 0.9 + Math.random() * 0.1;
    
    return {
      status: availability < 0.95 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
      responseTime,
      availability,
      lastCheck: new Date()
    };
  }

  private async checkNetworkHealth(): Promise<Partial<ComponentHealth>> {
    // Simulate network health check
    try {
      const startTime = Date.now();
      // In real implementation, this would ping actual endpoints
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
      const responseTime = Date.now() - startTime;
      
      return {
        status: HealthStatus.HEALTHY,
        responseTime,
        availability: 1.0,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: HealthStatus.OFFLINE,
        responseTime: 0,
        availability: 0,
        lastCheck: new Date()
      };
    }
  }

  private async checkUIHealth(): Promise<Partial<ComponentHealth>> {
    // Simulate UI health check
    return {
      status: HealthStatus.HEALTHY,
      responseTime: 50,
      availability: 1.0,
      lastCheck: new Date()
    };
  }

  private async checkDataStorageHealth(): Promise<Partial<ComponentHealth>> {
    // Simulate data storage health check
    return {
      status: HealthStatus.HEALTHY,
      responseTime: 100,
      availability: 1.0,
      lastCheck: new Date()
    };
  }

  private async checkAuthenticationHealth(): Promise<Partial<ComponentHealth>> {
    // Simulate authentication health check
    return {
      status: HealthStatus.HEALTHY,
      responseTime: 200,
      availability: 0.99,
      lastCheck: new Date()
    };
  }

  /**
   * Update component health
   */
  private updateComponentHealth(component: SystemComponent, updates: Partial<ComponentHealth>): void {
    const current = this.componentHealth.get(component);
    if (current) {
      this.componentHealth.set(component, { ...current, ...updates });
      this.emit('component-health-updated', component, { ...current, ...updates });
    }
  }

  /**
   * Evaluate degradation triggers
   */
  private async evaluateDegradationTriggers(component: SystemComponent): Promise<void> {
    const health = this.componentHealth.get(component);
    if (!health) return;

    for (const strategy of this.degradationStrategies.values()) {
      if (strategy.targetComponent !== component || !strategy.enabled) continue;

      const shouldTrigger = strategy.triggerConditions.some(trigger => 
        this.evaluateTriggerCondition(trigger, health)
      );

      if (shouldTrigger && !this.activeStrategies.has(strategy.id)) {
        await this.activateDegradationStrategy(strategy);
      } else if (!shouldTrigger && this.activeStrategies.has(strategy.id)) {
        await this.deactivateDegradationStrategy(strategy);
      }
    }
  }

  /**
   * Evaluate trigger condition
   */
  private evaluateTriggerCondition(trigger: DegradationTrigger, health: ComponentHealth): boolean {
    let value: number;
    
    switch (trigger.type) {
      case 'error_rate':
        value = health.errorCount / 100; // Normalize error count
        break;
      case 'response_time':
        value = health.responseTime;
        break;
      case 'availability':
        value = health.availability;
        break;
      default:
        return false;
    }

    switch (trigger.condition) {
      case 'greater_than':
        return value > trigger.threshold;
      case 'less_than':
        return value < trigger.threshold;
      case 'equals':
        return value === trigger.threshold;
      default:
        return false;
    }
  }

  /**
   * Activate degradation strategy
   */
  private async activateDegradationStrategy(strategy: DegradationStrategy): Promise<void> {
    console.log(`Activating degradation strategy: ${strategy.name}`);
    
    try {
      for (const action of strategy.fallbackActions) {
        const result = await action.execute();
        if (result.success) {
          this.activeStrategies.add(strategy.id);
          this.emit('degradation-activated', strategy.id, result);
          
          // Update component degradation level
          const health = this.componentHealth.get(strategy.targetComponent);
          if (health) {
            this.updateComponentHealth(strategy.targetComponent, {
              degradationLevel: result.newDegradationLevel
            });
          }
          
          break; // Stop after first successful action
        }
      }
    } catch (error) {
      console.error(`Failed to activate degradation strategy ${strategy.id}:`, error);
    }
  }

  /**
   * Deactivate degradation strategy
   */
  private async deactivateDegradationStrategy(strategy: DegradationStrategy): Promise<void> {
    console.log(`Deactivating degradation strategy: ${strategy.name}`);
    
    try {
      for (const action of strategy.fallbackActions) {
        await action.rollback();
      }
      
      this.activeStrategies.delete(strategy.id);
      this.emit('degradation-deactivated', strategy.id);
      
      // Restore component to full functionality
      const health = this.componentHealth.get(strategy.targetComponent);
      if (health) {
        this.updateComponentHealth(strategy.targetComponent, {
          degradationLevel: DegradationLevel.FULL_FUNCTIONALITY
        });
      }
    } catch (error) {
      console.error(`Failed to deactivate degradation strategy ${strategy.id}:`, error);
    }
  }

  /**
   * Fallback action implementations
   */
  private async enableManualMode(): Promise<FallbackResult> {
    return {
      success: true,
      message: 'Manual mode enabled - user will be guided through manual steps',
      newDegradationLevel: DegradationLevel.BASIC_FUNCTIONALITY,
      affectedFeatures: ['browser_automation', 'auto_navigation'],
      userMessage: 'Switched to manual mode. You will receive step-by-step instructions.'
    };
  }

  private async disableManualMode(): Promise<void> {
    // Restore browser automation
    console.log('Manual mode disabled - browser automation restored');
  }

  private async enableTemplateMode(): Promise<FallbackResult> {
    return {
      success: true,
      message: 'Template mode enabled - using pre-defined responses',
      newDegradationLevel: DegradationLevel.REDUCED_FUNCTIONALITY,
      affectedFeatures: ['ai_processing', 'personalized_responses'],
      userMessage: 'AI processing is limited. Using template responses for guidance.'
    };
  }

  private async disableTemplateMode(): Promise<void> {
    // Restore AI processing
    console.log('Template mode disabled - AI processing restored');
  }

  private async enableOfflineMode(): Promise<FallbackResult> {
    return {
      success: true,
      message: 'Offline mode enabled - using cached data and local processing',
      newDegradationLevel: DegradationLevel.OFFLINE_MODE,
      affectedFeatures: ['live_tools', 'real_time_data', 'cloud_sync'],
      userMessage: 'Working offline. Some features are limited to cached content.'
    };
  }

  private async disableOfflineMode(): Promise<void> {
    // Restore network functionality
    console.log('Offline mode disabled - network functionality restored');
  }

  /**
   * Update overall degradation level
   */
  private updateOverallDegradationLevel(): void {
    const componentLevels = Array.from(this.componentHealth.values())
      .map(health => health.degradationLevel);
    
    // Determine overall level based on worst component
    const levelPriority = {
      [DegradationLevel.EMERGENCY_MODE]: 5,
      [DegradationLevel.OFFLINE_MODE]: 4,
      [DegradationLevel.BASIC_FUNCTIONALITY]: 3,
      [DegradationLevel.REDUCED_FUNCTIONALITY]: 2,
      [DegradationLevel.FULL_FUNCTIONALITY]: 1
    };

    const worstLevel = componentLevels.reduce((worst, current) => 
      levelPriority[current] > levelPriority[worst] ? current : worst,
      DegradationLevel.FULL_FUNCTIONALITY
    );

    if (worstLevel !== this.currentDegradationLevel) {
      const previousLevel = this.currentDegradationLevel;
      this.currentDegradationLevel = worstLevel;
      this.emit('degradation-level-changed', worstLevel, previousLevel);
    }
  }

  /**
   * Manual degradation control
   */
  async triggerManualDegradation(component: SystemComponent, level: DegradationLevel): Promise<void> {
    const strategy = Array.from(this.degradationStrategies.values())
      .find(s => s.targetComponent === component);
    
    if (strategy) {
      await this.activateDegradationStrategy(strategy);
    }
  }

  async restoreComponent(component: SystemComponent): Promise<void> {
    const strategy = Array.from(this.degradationStrategies.values())
      .find(s => s.targetComponent === component);
    
    if (strategy && this.activeStrategies.has(strategy.id)) {
      await this.deactivateDegradationStrategy(strategy);
    }
  }

  /**
   * Get system health report
   */
  getSystemHealthReport(): SystemHealthReport {
    const components = Array.from(this.componentHealth.values());
    const overallHealth = this.calculateOverallHealth(components);
    
    return {
      overallHealth,
      degradationLevel: this.currentDegradationLevel,
      components,
      activeStrategies: Array.from(this.activeStrategies),
      recommendations: this.generateRecommendations(components),
      timestamp: new Date()
    };
  }

  /**
   * Calculate overall health
   */
  private calculateOverallHealth(components: ComponentHealth[]): HealthStatus {
    const statusPriority = {
      [HealthStatus.OFFLINE]: 5,
      [HealthStatus.FAILING]: 4,
      [HealthStatus.DEGRADED]: 3,
      [HealthStatus.UNKNOWN]: 2,
      [HealthStatus.HEALTHY]: 1
    };

    const worstStatus = components.reduce((worst, component) => 
      statusPriority[component.status] > statusPriority[worst] ? component.status : worst,
      HealthStatus.HEALTHY
    );

    return worstStatus;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(components: ComponentHealth[]): string[] {
    const recommendations: string[] = [];
    
    components.forEach(component => {
      if (component.status === HealthStatus.DEGRADED) {
        recommendations.push(`Consider restarting ${component.component} service`);
      }
      if (component.availability < 0.9) {
        recommendations.push(`Monitor ${component.component} for stability issues`);
      }
      if (component.responseTime > 2000) {
        recommendations.push(`Optimize ${component.component} performance`);
      }
    });

    if (this.currentDegradationLevel !== DegradationLevel.FULL_FUNCTIONALITY) {
      recommendations.push('System is running in degraded mode - some features may be limited');
    }

    return recommendations;
  }

  /**
   * Get offline capabilities
   */
  getOfflineCapabilities(): OfflineCapability[] {
    return Array.from(this.offlineCapabilities.values());
  }

  /**
   * Check if feature is available in current degradation level
   */
  isFeatureAvailable(feature: string): boolean {
    switch (this.currentDegradationLevel) {
      case DegradationLevel.FULL_FUNCTIONALITY:
        return true;
      case DegradationLevel.REDUCED_FUNCTIONALITY:
        return !['ai_processing', 'advanced_automation'].includes(feature);
      case DegradationLevel.BASIC_FUNCTIONALITY:
        return ['basic_ui', 'manual_mode', 'cached_content'].includes(feature);
      case DegradationLevel.OFFLINE_MODE:
        return ['cached_content', 'local_storage', 'basic_ui'].includes(feature);
      case DegradationLevel.EMERGENCY_MODE:
        return ['basic_ui'].includes(feature);
      default:
        return false;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.removeAllListeners();
  }
}

interface OfflineCapability {
  id: string;
  name: string;
  description: string;
  requiredComponents: SystemComponent[];
  features: string[];
  limitations: string[];
}

// Singleton instance
export const gracefulDegradationManager = new GracefulDegradationManager();