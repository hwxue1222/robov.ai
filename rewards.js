(async () => {
  const status = document.querySelector('#review-status');
  const container = document.querySelector('#review-tasks');
  const make = (tag, className, text) => { const el = document.createElement(tag); el.className = className; if (text) el.textContent = text; return el; };
  const statusNames = { ongoing:'进行中',expired:'已结束',paused:'已暂停',unavailable:'暂未开放' };
  const badge = state => make('span',`activity-badge activity-${state}`,statusNames[state] || statusNames.unavailable);
  try {
    const response = await fetch('/api/robov/rewards');
    if (!response.ok) throw new Error('UNAVAILABLE');
    const { tasks,activities=[],customActivities=[] } = await response.json();
    const campaigns=document.querySelector('#reward-campaigns');
    const registration=activities.find(item=>item.id==='registration');
    const voucher=activities.find(item=>item.id==='voucher');
    if(voucher) {
      const section=make('section','reward-campaign reward-promo');section.dataset.activityId='member-reward';
      const heading=make('div','reward-heading');heading.append(make('p','home-kicker','ROBOV REWARDS / JWD MEE TARIK'),make('h2','','5 ROBOV points = RM5 折扣券'),badge(voucher.status));
      const visual=make('div','reward-voucher'),copy=make('div','voucher-copy'),brand=make('div','voucher-brand');
      const logo=make('img','');logo.src='./assets/jwd/brand-icon.png';logo.alt='JWD Mee Tarik';logo.width=80;logo.height=80;brand.append(logo,make('span','','JWD Mee Tarik'));
      const value=make('p','voucher-value');value.append(make('small','','RM'),document.createTextNode('5'));
      copy.append(brand,make('p','voucher-label','ROBOV REWARDS'),value,make('p','voucher-caption','折扣券'),make('p','','100 ROBOV Points'));
      if(registration?.status==='ongoing') {
        const award=make('p','combined-signup-award'),label=make('span','','注册赠送积分');award.append(label,` / ${registration.rewardPoints} points`);copy.append(award,make('p','','新会员专享，每个账号一次。'));
      } else copy.append(make('p','combined-signup-award',registration?.status==='expired'?'注册奖励已结束':registration?.status==='paused'?'注册奖励已暂停':'注册奖励暂未开放'));
      if(voucher.status==='ongoing') {
        const signup=registration?.status==='ongoing',link=make('a','home-primary',signup?'注册会员':'会员登录');link.href=signup?'./login.html?mode=member&action=register':'./login.html?mode=member';copy.append(link);
      }
      const food=make('div','voucher-food'),image=make('img','');image.src='./assets/jwd/beef-noodles.jpg';image.alt='JWD Mee Tarik 红烧牛肉面';image.width=1000;image.height=750;food.append(image,make('span','','JWD / HAND-PULLED NOODLES'));visual.append(copy,food);
      const facts=make('div','voucher-facts');['5 ROBOV points 兑换 RM5','堂食满 RM50','JWD 所有营业门店通用'].forEach(text=>facts.append(make('span','',text)));
      const terms=make('details','voucher-terms');terms.append(make('summary','','使用条款'));const list=make('ul','');
      ['新会员专享，每个账号一次。','仅限堂食，单张账单消费满 RM50。','每张账单限用一张 RM5 折扣券，兑换扣除 5 ROBOV points。','不可与其他优惠、折扣或折扣券同时使用。','不可兑换现金；须由会员确认后抵用。','注册奖励与 Google Review 无关。'].forEach(text=>list.append(make('li','',text)));terms.append(list);
      for(const activity of [registration,voucher].filter(item=>item?.endsAt)) { const end=make('p','campaign-end');end.append(make('span','',activity.id==='registration'?'注册奖励截止时间':'RM5 活动截止时间'),' / '+new Date(activity.endsAt).toLocaleString('en-GB',{timeZone:'Asia/Singapore'})+' SGT');terms.append(end); }
      section.append(heading,visual,facts,terms);campaigns.append(section);
    }
    const reviewActivity=activities.find(item=>item.id==='google-review');
    document.querySelector('#google-activity-status').replaceWith(Object.assign(badge(reviewActivity?.status || 'ongoing'),{id:'google-activity-status'}));
    document.querySelector('#campaign-status').textContent='';
    for(const activity of customActivities){
      const article=make('article','custom-activity'),title=make('h2','',activity.title);title.dataset.noTranslate='';article.dataset.activityId=activity.id;
      article.append(title,badge(activity.status),make('p','',activity.kind==='SIGNUP'?'注册奖励':activity.kind==='VOUCHER'?'兑换优惠':'互动活动'),make('p','',activity.storeName||'全部门店'),make('p','',`${activity.points} points${activity.kind==='VOUCHER'?` = RM${(activity.discountCents/100).toFixed(2)}`:''}`));
      if(activity.kind==='VOUCHER'){const minimum=make('p','');minimum.append(make('span','','最低消费'),` / RM${(activity.minimumSpendCents/100).toFixed(2)}`);article.append(minimum,make('p','','堂食且未使用其他优惠'),make('p','','每张账单限用一张优惠券'));}
      if(activity.kind==='INTERACTION'&&activity.points>0)article.append(make('p','','每活动每会员一次，商家审核发放'));
      if(activity.status==='ongoing'){
        const link=make('a','home-primary',activity.kind==='SIGNUP'?'注册会员':activity.url?'参与活动':'会员登录');
        link.href=activity.kind==='SIGNUP'?'./login.html?action=register':activity.url||'./login.html';
        if(activity.url&&activity.kind!=='SIGNUP'){link.target='_blank';link.rel='noopener noreferrer';}article.append(link);
      }document.querySelector('#custom-activities').append(article);
    }
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
