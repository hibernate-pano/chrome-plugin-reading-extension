import { 
  ProgressOptions, 
  ProgressInstance, 
  ProgressType,
  FeedbackConfig 
} from './types';

/**
 * 进度管理器
 * 负责管理所有进度指示器的生命周期
 */
export class ProgressManager {
  private static instance: ProgressManager;
  private progressInstances: Map<string, ProgressInstance> = new Map();
  private containers: Map<string, HTMLElement> = new Map();
  private config: FeedbackConfig;
  private nextId = 1;

  private constructor() {
    this.config = {
      position: 'top-right' as any,
      maxNotifications: 5,
      defaultDuration: 5000,
      showProgress: true,
      dismissible: true,
      theme: 'auto',
      enableSound: false,
      enableVibration: false,
      enableAnimations: true,
      zIndex: 9999
    };
  }

  public static getInstance(): ProgressManager {
    if (!ProgressManager.instance) {
      ProgressManager.instance = new ProgressManager();
    }
    return ProgressManager.instance;
  }

  /**
   * 创建进度指示器
   */
  public create(options: ProgressOptions): ProgressInstance {
    const id = options.id || `progress-${this.nextId++}`;
    
    // 创建进度元素
    const progressElement = this.createProgressElement({
      ...options,
      id
    });

    // 创建容器（如果不存在）
    const containerId = `progress-container-${options.type || ProgressType.LINEAR}`;
    let container = this.containers.get(containerId);
    
    if (!container) {
      container = this.createContainer(containerId, options.type || ProgressType.LINEAR);
      this.containers.set(containerId, container);
    }

    // 添加到容器
    container.appendChild(progressElement);

    // 创建进度实例
    const progressInstance: ProgressInstance = {
      id,
      update: (value: number) => this.updateProgress(id, value),
      setLabel: (label: string) => this.setLabel(id, label),
      complete: () => this.completeProgress(id),
      destroy: () => this.destroyProgress(id)
    };

    // 存储实例
    this.progressInstances.set(id, progressInstance);

    // 管理容器大小
    this.manageContainerSize(container);

    return progressInstance;
  }

  /**
   * 创建进度元素
   */
  private createProgressElement(options: ProgressOptions & { id: string }): HTMLElement {
    const progress = document.createElement('div');
    progress.className = 'chrome-extension-progress';
    progress.dataset.progressId = options.id;
    progress.style.cssText = this.getProgressStyles(options);

    // 创建内容
    const content = this.createProgressContent(options);
    progress.appendChild(content);

    // 添加动画
    if (this.config.enableAnimations) {
      this.addProgressAnimation(progress);
    }

    return progress;
  }

  /**
   * 创建进度内容
   */
  private createProgressContent(options: ProgressOptions & { id: string }): HTMLElement {
    const content = document.createElement('div');
    content.className = 'chrome-extension-progress__content';

    // 标签
    if (options.showLabel && options.label) {
      const label = document.createElement('div');
      label.className = 'chrome-extension-progress__label';
      label.textContent = options.label;
      content.appendChild(label);
    }

    // 进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.className = 'chrome-extension-progress__container';

    // 根据类型创建不同的进度条
    switch (options.type) {
      case ProgressType.CIRCULAR:
        progressContainer.appendChild(this.createCircularProgress(options));
        break;
      case ProgressType.STEPS:
        progressContainer.appendChild(this.createStepsProgress(options));
        break;
      case ProgressType.INDETERMINATE:
        progressContainer.appendChild(this.createIndeterminateProgress(options));
        break;
      default:
        progressContainer.appendChild(this.createLinearProgress(options));
    }

    content.appendChild(progressContainer);

    // 数值显示
    if (options.showValue) {
      const valueDisplay = document.createElement('div');
      valueDisplay.className = 'chrome-extension-progress__value';
      valueDisplay.textContent = `${Math.round((options.value || 0) / (options.max || 100) * 100)}%`;
      content.appendChild(valueDisplay);
    }

    return content;
  }

  /**
   * 创建线性进度条
   */
  private createLinearProgress(options: ProgressOptions): HTMLElement {
    const container = document.createElement('div');
    container.className = 'chrome-extension-progress__linear';

    const track = document.createElement('div');
    track.className = 'chrome-extension-progress__track';

    const bar = document.createElement('div');
    bar.className = 'chrome-extension-progress__bar';
    bar.style.width = `${(options.value || 0) / (options.max || 100) * 100}%`;

    if (options.striped) {
      bar.classList.add('chrome-extension-progress__bar--striped');
    }

    track.appendChild(bar);
    container.appendChild(track);

    return container;
  }

  /**
   * 创建圆形进度条
   */
  private createCircularProgress(options: ProgressOptions): HTMLElement {
    const container = document.createElement('div');
    container.className = 'chrome-extension-progress__circular';

    const size = options.size === 'sm' ? 40 : options.size === 'lg' ? 80 : 60;
    const strokeWidth = options.size === 'sm' ? 3 : options.size === 'lg' ? 6 : 4;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', size.toString());
    svg.setAttribute('height', size.toString());
    svg.style.transform = 'rotate(-90deg)';

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (options.value || 0) / (options.max || 100);
    const offset = circumference - progress * circumference;

    // 背景圆环
    const backgroundCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    backgroundCircle.setAttribute('cx', (size / 2).toString());
    backgroundCircle.setAttribute('cy', (size / 2).toString());
    backgroundCircle.setAttribute('r', radius.toString());
    backgroundCircle.setAttribute('stroke', '#e5e7eb');
    backgroundCircle.setAttribute('stroke-width', strokeWidth.toString());
    backgroundCircle.setAttribute('fill', 'transparent');

    // 进度圆环
    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.setAttribute('cx', (size / 2).toString());
    progressCircle.setAttribute('cy', (size / 2).toString());
    progressCircle.setAttribute('r', radius.toString());
    progressCircle.setAttribute('stroke', this.getProgressColor(options.variant || 'default'));
    progressCircle.setAttribute('stroke-width', strokeWidth.toString());
    progressCircle.setAttribute('fill', 'transparent');
    progressCircle.setAttribute('stroke-dasharray', circumference.toString());
    progressCircle.setAttribute('stroke-dashoffset', offset.toString());
    progressCircle.setAttribute('stroke-linecap', 'round');

    svg.appendChild(backgroundCircle);
    svg.appendChild(progressCircle);
    container.appendChild(svg);

    return container;
  }

  /**
   * 创建步骤进度条
   */
  private createStepsProgress(options: ProgressOptions): HTMLElement {
    const container = document.createElement('div');
    container.className = 'chrome-extension-progress__steps';

    const steps = Math.ceil(options.max || 100);
    const currentStep = Math.ceil(options.value || 0);

    for (let i = 0; i < steps; i++) {
      const step = document.createElement('div');
      step.className = 'chrome-extension-progress__step';
      
      if (i < currentStep) {
        step.classList.add('chrome-extension-progress__step--completed');
      }
      
      container.appendChild(step);
    }

    return container;
  }

  /**
   * 创建不确定进度条
   */
  private createIndeterminateProgress(options: ProgressOptions): HTMLElement {
    const container = document.createElement('div');
    container.className = 'chrome-extension-progress__indeterminate';

    const track = document.createElement('div');
    track.className = 'chrome-extension-progress__track';

    const bar = document.createElement('div');
    bar.className = 'chrome-extension-progress__bar chrome-extension-progress__bar--indeterminate';
    bar.style.background = `linear-gradient(90deg, transparent, ${this.getProgressColor(options.variant || 'default')}, transparent)`;

    track.appendChild(bar);
    container.appendChild(track);

    return container;
  }

  /**
   * 创建容器
   */
  private createContainer(containerId: string, type: ProgressType): HTMLElement {
    const container = document.createElement('div');
    container.id = containerId;
    container.className = `chrome-extension-progress-container chrome-extension-progress-container--${type}`;
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: ${this.config.zIndex};
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 300px;
      pointer-events: none;
    `;

    document.body.appendChild(container);
    return container;
  }

  /**
   * 获取进度样式
   */
  private getProgressStyles(options: ProgressOptions): string {
    const baseStyles = `
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      pointer-events: auto;
      min-width: 250px;
    `;

    return baseStyles;
  }

  /**
   * 获取进度颜色
   */
  private getProgressColor(variant: string): string {
    switch (variant) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  }

  /**
   * 添加进度动画
   */
  private addProgressAnimation(progress: HTMLElement): void {
    progress.style.opacity = '0';
    progress.style.transform = 'translateX(20px)';
    
    requestAnimationFrame(() => {
      progress.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      progress.style.opacity = '1';
      progress.style.transform = 'translateX(0)';
    });
  }

  /**
   * 管理容器大小
   */
  private manageContainerSize(container: HTMLElement): void {
    const progressElements = container.querySelectorAll('.chrome-extension-progress');
    
    if (progressElements.length > this.config.maxNotifications) {
      const oldestProgress = progressElements[0];
      if (oldestProgress) {
        oldestProgress.remove();
      }
    }
  }

  /**
   * 更新进度
   */
  private updateProgress(id: string, value: number): void {
    const progressInstance = this.progressInstances.get(id);
    if (!progressInstance) return;

    const progressElement = document.querySelector(`[data-progress-id="${id}"]`);
    if (!progressElement) return;

    // 更新进度条
    const bar = progressElement.querySelector('.chrome-extension-progress__bar');
    if (bar) {
      const max = parseFloat(progressElement.dataset.max || '100');
      const percentage = Math.min(100, Math.max(0, (value / max) * 100));
      bar.style.width = `${percentage}%`;
    }

    // 更新圆形进度条
    const svg = progressElement.querySelector('svg');
    if (svg) {
      const circle = svg.querySelector('circle:last-child');
      if (circle) {
        const radius = parseFloat(circle.getAttribute('r') || '0');
        const circumference = 2 * Math.PI * radius;
        const max = parseFloat(progressElement.dataset.max || '100');
        const progress = value / max;
        const offset = circumference - progress * circumference;
        circle.setAttribute('stroke-dashoffset', offset.toString());
      }
    }

    // 更新步骤进度条
    const steps = progressElement.querySelectorAll('.chrome-extension-progress__step');
    if (steps.length > 0) {
      const max = parseFloat(progressElement.dataset.max || '100');
      const currentStep = Math.ceil(value);
      
      steps.forEach((step, index) => {
        if (index < currentStep) {
          step.classList.add('chrome-extension-progress__step--completed');
        } else {
          step.classList.remove('chrome-extension-progress__step--completed');
        }
      });
    }

    // 更新数值显示
    const valueDisplay = progressElement.querySelector('.chrome-extension-progress__value');
    if (valueDisplay) {
      const max = parseFloat(progressElement.dataset.max || '100');
      const percentage = Math.round((value / max) * 100);
      valueDisplay.textContent = `${percentage}%`;
    }

    // 更新数据属性
    progressElement.dataset.value = value.toString();
  }

  /**
   * 设置标签
   */
  private setLabel(id: string, label: string): void {
    const progressElement = document.querySelector(`[data-progress-id="${id}"]`);
    if (!progressElement) return;

    const labelElement = progressElement.querySelector('.chrome-extension-progress__label');
    if (labelElement) {
      labelElement.textContent = label;
    }
  }

  /**
   * 完成进度
   */
  private completeProgress(id: string): void {
    this.updateProgress(id, 100);
    
    // 延迟销毁
    setTimeout(() => {
      this.destroyProgress(id);
    }, 1000);
  }

  /**
   * 销毁进度指示器
   */
  private destroyProgress(id: string): void {
    const progressInstance = this.progressInstances.get(id);
    if (!progressInstance) return;

    const progressElement = document.querySelector(`[data-progress-id="${id}"]`);
    if (progressElement) {
      // 添加销毁动画
      if (this.config.enableAnimations) {
        progressElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        progressElement.style.opacity = '0';
        progressElement.style.transform = 'translateX(20px)';
        
        setTimeout(() => {
          progressElement.remove();
        }, 300);
      } else {
        progressElement.remove();
      }
    }

    // 移除实例
    this.progressInstances.delete(id);
  }

  /**
   * 获取统计信息
   */
  public getStats(): { total: number; active: number } {
    return {
      total: this.progressInstances.size,
      active: this.progressInstances.size
    };
  }

  /**
   * 销毁所有进度指示器
   */
  public destroyAll(): void {
    this.progressInstances.forEach((_, id) => {
      this.destroyProgress(id);
    });
  }
}

export const progressManager = ProgressManager.getInstance();
export default progressManager;
