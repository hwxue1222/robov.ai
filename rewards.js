(async () => {
  const status = document.querySelector('#review-status');
  const container = document.querySelector('#review-tasks');
  const make = (tag, className, text) => { const el = document.createElement(tag); el.className = className; if (text) el.textContent = text; return el; };
  const statusNames = { ongoing:'进行中',expired:'已结束',paused:'已暂停',unavailable:'暂未开放' };
  const badge = state => make('span',`activity-badge activity-${state}`,statusNames[state] || statusNames.unavailable);
  try {
    const response = await fetch('/api/robov/rewards');
    if (!response.ok) throw new Error('UNAVAILABLE');
    const { tasks,activities=[] } = await response.json();
    const campaigns=document.querySelector('#reward-campaigns');
    for(const activity of activities.filter(item=>item.id!=='google-review')) {
      const article=make('article','reward-campaign');article.dataset.activityId=activity.id;
      article.append(badge(activity.status));
      if(activity.id==='registration') {
        article.append(make('p','eyebrow','ROBOV / MEMBER'),make('h2','','会员注册奖励'));
        const value=make('p','campaign-value');value.append(make('strong','',activity.rewardPoints===null?'—':String(activity.rewardPoints)),document.createTextNode(' points'));article.append(value,make('p','','新会员专享，每个账号一次。'));
      } else {
        const image=make('img','campaign-dish');image.src='./assets/jwd/beef-noodles.jpg';image.alt='JWD Mee Tarik 红烧牛肉面';article.append(image,make('h2','','RM5 折扣券'),make('p','campaign-value','100 points = RM5'),make('p','','JWD 所有营业门店通用'));
        const terms=make('details','campaign-terms');terms.append(make('summary','','使用条款'));
        ['仅限堂食，单张账单消费满 RM50。','每张账单限用一张 RM5 折扣券，兑换扣除 100 points。','不可与其他优惠、折扣或折扣券同时使用。','不可兑换现金；须由会员确认后抵用。'].forEach(text=>terms.append(make('p','',text)));article.append(terms);
      }
      if(activity.endsAt) { const end=make('p','campaign-end'),label=make('span','','截止时间');end.append(label,' / '+new Date(activity.endsAt).toLocaleString('en-GB',{timeZone:'Asia/Singapore'})+' SGT');article.append(end); }
      if(activity.status==='ongoing') { const link=make('a','home-primary',activity.id==='registration'?'注册会员':'会员登录');link.href=activity.id==='registration'?'./login.html?mode=member&action=register':'./login.html?mode=member';article.append(link); }
      campaigns.append(article);
    }
    const reviewActivity=activities.find(item=>item.id==='google-review');
    document.querySelector('#google-activity-status').replaceWith(Object.assign(badge(reviewActivity?.status || 'ongoing'),{id:'google-activity-status'}));
    document.querySelector('#campaign-status').textContent='';
    for (const task of tasks) {
      const article = make('article', 'review-task');
      const top = make('div', 'review-task-top');
      top.append(make('span', 'review-google', 'G'), badge(task.status || 'ongoing'));
      article.append(top, make('h2', '', task.storeName), make('p', '', task.businessName), make('p','review-label','自愿参与'), make('p', 'review-address', task.address));
      if (task.available && task.url) {
        const url = new URL(task.url);
        if (url.protocol !== 'https:') throw new Error('INVALID_URL');
        const link = make('a', 'home-primary', '前往 Google 评价 ↗');
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', `${task.storeName} Google Review`);
        article.append(link);
      } else article.append(make('p', '', task.status === 'expired' ? '活动已结束' : '评价入口暂未开放'));
      container.append(article);
    }
    status.textContent = tasks.length ? '' : '暂无开放任务';
  } catch { container.replaceChildren(); document.querySelector('#reward-campaigns').replaceChildren();document.querySelector('#campaign-status').textContent='';status.textContent = '暂时无法加载，请稍后重试。'; }
})();
