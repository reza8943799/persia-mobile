import asyncio,json,sys
from playwright.async_api import async_playwright
async def main(path,outp):
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':390,'height':844})
        await pg.goto('file://'+path); await pg.wait_for_timeout(2500)
        await pg.add_script_tag(path='/home/claude/w/audit.js')
        tabs=await pg.evaluate("Array.from(document.querySelectorAll('[id^=tab-content-]')).map(e=>e.id.replace('tab-content-',''))")
        print('tabs',tabs)
        res={}
        for theme in ['light','dark']:
            await pg.evaluate("t=>{document.body.classList.toggle('dark-mode',t==='dark')}",theme)
            agg={'total':0,'groups':{}}
            for t in tabs:
                try: await pg.evaluate("n=>{window.openTab(n)}",t)
                except Exception as e: pass
                await pg.wait_for_timeout(350)
                r=await pg.evaluate("()=>window.__audit(document.body)")
                agg['total']+=r['total']
                for k,v in r['groups'].items():
                    g=agg['groups'].setdefault(k,{'n':0,'worst':99,'sample':'','fg':'','bg':'','tabs':[],'tag':'','inl':'','cls':'','sig':''})
                    g['n']+=v['n']; 
                    if t not in g['tabs']: g['tabs'].append(t)
                    if v['worst']<g['worst']: g.update({k2:v[k2] for k2 in ['worst','sample','fg','bg','tag','inl','cls','sig']})
            await pg.add_style_tag(content=".modal-overlay,.modal-overlay *{animation:none !important;transition:none !important;}") if theme=='light' else None
            mods=await pg.evaluate("Array.from(document.querySelectorAll('.modal-overlay')).map(e=>e.id).filter(Boolean)")
            for mid in mods:
                try:
                    await pg.evaluate("id=>{var e=document.getElementById(id);e.style.display='flex';}",mid)
                    await pg.wait_for_timeout(120)
                    r=await pg.evaluate("id=>window.__audit(document.getElementById(id))",mid)
                    await pg.evaluate("id=>{document.getElementById(id).style.display='none';}",mid)
                except Exception as e: continue
                agg['total']+=r['total']
                for k,v in r['groups'].items():
                    g=agg['groups'].setdefault(k,{'n':0,'worst':99,'sample':'','fg':'','bg':'','tabs':[],'tag':'','inl':'','cls':'','sig':''})
                    g['n']+=v['n']
                    if 'modal:'+mid not in g['tabs'] and len(g['tabs'])<4: g['tabs'].append('modal:'+mid)
                    if v['worst']<g['worst']: g.update({k2:v[k2] for k2 in ['worst','sample','fg','bg','tag','inl','cls','sig']})
            res[theme]=agg
            print(theme,'texts checked',agg['total'],'groups',len(agg['groups']),'failing elements',sum(g['n'] for g in agg['groups'].values()))
        json.dump(res,open(outp,'w'),ensure_ascii=False)
        await b.close()
asyncio.run(main(sys.argv[1],sys.argv[2]))
